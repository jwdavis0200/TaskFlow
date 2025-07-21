const { onCall, HttpsError } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const { validateAuth, validateProjectAccess } = require('./middleware/auth');
const { FieldValue, Timestamp } = require('firebase-admin/firestore');

/**
 * Get projects for the authenticated user
 */
exports.getProjects = onCall(async (request) => {
  const userId = validateAuth(request);
  const db = admin.firestore();
  
  try {
    // Query projects where user is owner or member
    const ownerProjectsSnapshot = await db.collection('projects')
      .where('owner', '==', userId)
      .get();
    
    const memberProjectsSnapshot = await db.collection('projects')
      .where('members', 'array-contains', userId)
      .get();
    
    // Combine and deduplicate results
    const projectMap = new Map();
    
    // Add owner projects
    ownerProjectsSnapshot.docs.forEach(doc => {
      projectMap.set(doc.id, { id: doc.id, ...doc.data() });
    });
    
    // Add member projects (avoid duplicates)
    memberProjectsSnapshot.docs.forEach(doc => {
      if (!projectMap.has(doc.id)) {
        projectMap.set(doc.id, { id: doc.id, ...doc.data() });
      }
    });
    
    // Get board count for each project and populate boards data
    const projects = await Promise.all(Array.from(projectMap.values()).map(async (project) => {
      // Get boards for this project
      const boardsSnapshot = await db.collection('boards')
        .where('projectId', '==', project.id)
        .get();
      
      const boards = await Promise.all(boardsSnapshot.docs.map(async (boardDoc) => {
        const boardData = { id: boardDoc.id, ...boardDoc.data() };
        
        // Get columns for this board
        const columnsSnapshot = await db.collection('columns')
          .where('boardId', '==', boardDoc.id)
          .orderBy('order')
          .get();
        
        const columns = await Promise.all(columnsSnapshot.docs.map(async (columnDoc) => {
          const columnData = { id: columnDoc.id, ...columnDoc.data() };
          
          // Get tasks for this column
          const tasksSnapshot = await db.collection('tasks')
            .where('columnId', '==', columnDoc.id)
            .orderBy('createdAt')
            .get();
          
          columnData.tasks = tasksSnapshot.docs.map(taskDoc => {
            const taskData = taskDoc.data();
            return {
              id: taskDoc.id,
              ...taskData,
              createdAt: taskData.createdAt?.toDate?.(),
              updatedAt: taskData.updatedAt?.toDate?.(),
              dueDate: taskData.dueDate?.toDate?.()
            };
          });
          
          return columnData;
        }));
        
        boardData.columns = columns;
        return boardData;
      }));
      
      return {
        ...project,
        boards,
        boardCount: boards.length,
        createdAt: project.createdAt?.toDate?.(),
        updatedAt: project.updatedAt?.toDate?.()
      };
    }));
    
    return projects;
  } catch (error) {
    console.error('Error getting projects:', error);
    throw new HttpsError('internal', 'Failed to get projects');
  }
});

/**
 * Create a new project with default board and columns
 */
exports.createProject = onCall(async (request) => {
  const userId = validateAuth(request);
  const { name, description } = request.data;
  
  if (!name) {
    throw new HttpsError('invalid-argument', 'Project name is required');
  }
  
  const db = admin.firestore();
  
  try {
    // Create project + default board + default columns atomically
    const result = await db.runTransaction(async (transaction) => {
      const projectRef = db.collection('projects').doc();
      const boardRef = db.collection('boards').doc();
      
      // Create project
      transaction.set(projectRef, {
        name,
        description: description || '',
        owner: userId,
        members: [userId],
        boards: [boardRef.id],
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      });
      
      // Create default board
      transaction.set(boardRef, {
        name: "Main Board",
        projectId: projectRef.id,
        columns: [], // Will be populated with default columns
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      });
      
      // Create default columns
      const columnNames = ["To Do", "In Progress", "Done"];
      const columnIds = [];
      
      columnNames.forEach((columnName, index) => {
        const columnRef = db.collection('columns').doc();
        columnIds.push(columnRef.id);
        
        transaction.set(columnRef, {
          name: columnName,
          boardId: boardRef.id,
          projectId: projectRef.id,
          order: index,
          tasks: [],
          createdAt: FieldValue.serverTimestamp()
        });
      });
      
      // Update board with column IDs
      transaction.update(boardRef, { columns: columnIds });
      
      return { projectId: projectRef.id, boardId: boardRef.id };
    });
    
    return result;
  } catch (error) {
    console.error('Error creating project:', error);
    throw new HttpsError('internal', 'Failed to create project');
  }
});

/**
 * Update a project
 */
exports.updateProject = onCall(async (request) => {
  const userId = validateAuth(request);
  const { projectId, updates } = request.data;
  
  if (!projectId) {
    throw new HttpsError('invalid-argument', 'Project ID is required');
  }
  
  const db = admin.firestore();
  
  try {
    // Validate project access
    await validateProjectAccess(db, projectId, userId);
    
    // Update project
    await db.collection('projects').doc(projectId).update({
      ...updates,
      updatedAt: FieldValue.serverTimestamp()
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error updating project:', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', 'Failed to update project');
  }
});

/**
 * Delete a project and all its related data
 */
exports.deleteProject = onCall(async (request) => {
  const userId = validateAuth(request);
  const { projectId } = request.data;
  
  if (!projectId) {
    throw new HttpsError('invalid-argument', 'Project ID is required');
  }
  
  const db = admin.firestore();
  
  try {
    // Validate project access and ownership
    const projectData = await validateProjectAccess(db, projectId, userId);
    
    if (projectData.owner !== userId) {
      throw new HttpsError('permission-denied', 'Only project owner can delete the project');
    }
    
    // Cascade delete: project → boards → columns → tasks
    await db.runTransaction(async (transaction) => {
      // Delete all tasks in project
      const tasksSnapshot = await db.collection('tasks').where('projectId', '==', projectId).get();
      tasksSnapshot.docs.forEach(doc => transaction.delete(doc.ref));
      
      // Delete all columns in project
      const columnsSnapshot = await db.collection('columns').where('projectId', '==', projectId).get();
      columnsSnapshot.docs.forEach(doc => transaction.delete(doc.ref));
      
      // Delete all boards in project
      const boardsSnapshot = await db.collection('boards').where('projectId', '==', projectId).get();
      boardsSnapshot.docs.forEach(doc => transaction.delete(doc.ref));
      
      // Delete project
      transaction.delete(db.collection('projects').doc(projectId));
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error deleting project:', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', 'Failed to delete project');
  }
});

// Invite user to project
exports.inviteUserToProject = onCall(async (request) => {
  const userId = validateAuth(request);
  const { projectId, email, role = 'editor' } = request.data;
  
  if (!projectId || !email) {
    throw new HttpsError('invalid-argument', 'Project ID and email are required');
  }
  
  const db = admin.firestore();
  
  try {
    // Validate project access and ownership
    const projectData = await validateProjectAccess(db, projectId, userId);
    
    if (projectData.owner !== userId) {
      throw new HttpsError('permission-denied', 'Only project owner can invite members');
    }
    
    // Check if user already exists in Firebase Auth by email
    let inviteeUser;
    try {
      inviteeUser = await admin.auth().getUserByEmail(email);
    } catch (error) {
      // User doesn't exist in Firebase Auth yet
      inviteeUser = null;
    }
    
    // Check if user is already a member
    if (inviteeUser && projectData.members.includes(inviteeUser.uid)) {
      throw new HttpsError('already-exists', 'User is already a member of this project');
    }
    
    // Create invitation
    const invitationRef = db.collection('invitations').doc();
    const expirationDate = new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)); // 7 days from now
    await invitationRef.set({
      projectId,
      projectName: projectData.name,
      inviterUserId: userId,
      inviterEmail: request.auth.token.email,
      inviteeEmail: email.toLowerCase(),
      inviteeUserId: inviteeUser?.uid || null,
      role,
      status: 'pending',
      createdAt: FieldValue.serverTimestamp(),
      expiresAt: Timestamp.fromDate(expirationDate)
    });
    
    return { 
      invitationId: invitationRef.id,
      message: `Invitation sent to ${email}`
    };
  } catch (error) {
    console.error('Error inviting user:', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', 'Failed to invite user');
  }
});

// Accept project invitation
exports.acceptProjectInvitation = onCall(async (request) => {
  const userId = validateAuth(request);
  const { invitationId } = request.data;
  
  if (!invitationId) {
    throw new HttpsError('invalid-argument', 'Invitation ID is required');
  }
  
  const db = admin.firestore();
  
  try {
    const invitationDoc = await db.collection('invitations').doc(invitationId).get();
    
    if (!invitationDoc.exists) {
      throw new HttpsError('not-found', 'Invitation not found');
    }
    
    const invitation = invitationDoc.data();
    
    // Validate invitation
    if (invitation.status !== 'pending') {
      throw new HttpsError('invalid-argument', 'Invitation already processed');
    }
    
    if (invitation.inviteeUserId && invitation.inviteeUserId !== userId) {
      throw new HttpsError('permission-denied', 'Invitation not for this user');
    }
    
    if (!invitation.inviteeUserId && invitation.inviteeEmail !== request.auth.token.email) {
      throw new HttpsError('permission-denied', 'Invitation not for this email');
    }
    
    // Check if invitation expired
    const now = new Date();
    const expiresAt = invitation.expiresAt.toDate ? invitation.expiresAt.toDate() : new Date(invitation.expiresAt);
    if (now > expiresAt) {
      throw new HttpsError('deadline-exceeded', 'Invitation has expired');
    }
    
    // Add user to project members
    await db.runTransaction(async (transaction) => {
      const projectRef = db.collection('projects').doc(invitation.projectId);
      const projectDoc = await transaction.get(projectRef);
      
      if (!projectDoc.exists) {
        throw new HttpsError('not-found', 'Project no longer exists');
      }
      
      const projectData = projectDoc.data();
      
      // Check if user is already a member
      if (projectData.members.includes(userId)) {
        throw new HttpsError('already-exists', 'User is already a member');
      }
      
      // Add user to members array
      transaction.update(projectRef, {
        members: FieldValue.arrayUnion(userId),
        updatedAt: FieldValue.serverTimestamp()
      });
      
      // Update invitation status
      transaction.update(invitationDoc.ref, {
        status: 'accepted',
        acceptedAt: FieldValue.serverTimestamp(),
        inviteeUserId: userId
      });
    });
    
    return { success: true, projectId: invitation.projectId };
  } catch (error) {
    console.error('Error accepting invitation:', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', 'Failed to accept invitation');
  }
});

// Remove project member
exports.removeProjectMember = onCall(async (request) => {
  const userId = validateAuth(request);
  const { projectId, memberUserId } = request.data;
  
  if (!projectId || !memberUserId) {
    throw new HttpsError('invalid-argument', 'Project ID and member user ID are required');
  }
  
  if (userId === memberUserId) {
    throw new HttpsError('invalid-argument', 'Cannot remove yourself from project');
  }
  
  const db = admin.firestore();
  
  try {
    // Validate project access and ownership
    const projectData = await validateProjectAccess(db, projectId, userId);
    
    if (projectData.owner !== userId) {
      throw new HttpsError('permission-denied', 'Only project owner can remove members');
    }
    
    // Check if user is actually a member
    if (!projectData.members.includes(memberUserId)) {
      throw new HttpsError('not-found', 'User is not a member of this project');
    }
    
    // Remove user from members array
    await db.collection('projects').doc(projectId).update({
      members: FieldValue.arrayRemove(memberUserId),
      updatedAt: FieldValue.serverTimestamp()
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error removing member:', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', 'Failed to remove member');
  }
});

// Get project invitations (for the invited user)
exports.getMyInvitations = onCall(async (request) => {
  const userId = validateAuth(request);
  const userEmail = request.auth.token.email;
  
  const db = admin.firestore();
  
  try {
    // Get invitations by user ID or email
    const invitationsByUserId = await db.collection('invitations')
      .where('inviteeUserId', '==', userId)
      .where('status', '==', 'pending')
      .get();
      
    const invitationsByEmail = await db.collection('invitations')
      .where('inviteeEmail', '==', userEmail)
      .where('status', '==', 'pending')
      .get();
    
    // Combine and deduplicate
    const invitationMap = new Map();
    
    [...invitationsByUserId.docs, ...invitationsByEmail.docs].forEach(doc => {
      const data = doc.data();
      invitationMap.set(doc.id, {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.(),
        expiresAt: data.expiresAt?.toDate?.()
      });
    });
    
    return Array.from(invitationMap.values());
  } catch (error) {
    console.error('Error getting invitations:', error);
    throw new HttpsError('internal', 'Failed to get invitations');
  }
});

// Get project members details (for UI display)
exports.getProjectMembers = onCall(async (request) => {
  const userId = validateAuth(request);
  const { memberIds } = request.data;
  
  if (!memberIds || !Array.isArray(memberIds)) {
    throw new HttpsError('invalid-argument', 'Member IDs array is required');
  }
  
  try {
    // Get user details from Firebase Auth
    const members = await Promise.all(
      memberIds.map(async (memberId) => {
        try {
          const userRecord = await admin.auth().getUser(memberId);
          return {
            uid: userRecord.uid,
            email: userRecord.email,
            displayName: userRecord.displayName || null
          };
        } catch (error) {
          // If user doesn't exist anymore, return basic info
          return {
            uid: memberId,
            email: 'Unknown user',
            displayName: null
          };
        }
      })
    );
    
    return members;
  } catch (error) {
    console.error('Error getting project members:', error);
    throw new HttpsError('internal', 'Failed to get project members');
  }
});