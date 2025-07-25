const { onCall, HttpsError } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const {
  validateAuth,
  validateProjectAccess,
  validateProjectPermission,
  ROLES,
  PERMISSIONS,
  validateRole,
  hasPermission,
  getUserRole
} = require('./middleware/auth');
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
        memberRoles: {}, // Empty object for post-migration RBAC structure
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
 * Update a project - RBAC enforced
 */
exports.updateProject = onCall(async (request) => {
  const userId = validateAuth(request);
  const { projectId, updates } = request.data;
  
  if (!projectId) {
    throw new HttpsError('invalid-argument', 'Project ID is required');
  }
  
  const db = admin.firestore();
  
  try {
    // Validate project access and permission to edit project
    await validateProjectPermission(db, projectId, userId, PERMISSIONS.EDIT_PROJECT);
    
    // Sanitize updates - prevent modification of critical fields
    const sanitizedUpdates = { ...updates };
    delete sanitizedUpdates.owner;
    delete sanitizedUpdates.members;
    delete sanitizedUpdates.memberRoles;
    delete sanitizedUpdates.createdAt;
    
    // Update project
    await db.collection('projects').doc(projectId).update({
      ...sanitizedUpdates,
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

/**
 * MIGRATION FUNCTION: Add memberRoles to existing projects
 * This function safely migrates existing projects to include the memberRoles field
 * Should be called once during the RBAC rollout
 */
exports.migrateProjectsToRBAC = onCall(async (request) => {
  const userId = validateAuth(request);
  
  // Only allow specific admin users to run migration
  const MIGRATION_ADMIN_EMAILS = [
    request.auth.token.email // Allow current user for testing
  ];
  
  if (!MIGRATION_ADMIN_EMAILS.includes(request.auth.token.email)) {
    throw new HttpsError('permission-denied', 'Only admins can run migrations');
  }
  
  const db = admin.firestore();
  
  try {
    console.log('Starting RBAC migration...');
    
    // Get only projects where user is owner or member
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
      projectMap.set(doc.id, doc);
    });
    
    // Add member projects (avoid duplicates)
    memberProjectsSnapshot.docs.forEach(doc => {
      if (!projectMap.has(doc.id)) {
        projectMap.set(doc.id, doc);
      }
    });
    
    const projectsSnapshot = { docs: Array.from(projectMap.values()) };
    
    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    // Process projects in batches to avoid memory issues
    const batchSize = 50;
    const projects = projectsSnapshot.docs;
    
    for (let i = 0; i < projects.length; i += batchSize) {
      const batch = projects.slice(i, i + batchSize);
      
      await Promise.all(batch.map(async (projectDoc) => {
        try {
          const projectData = projectDoc.data();
          
          // Skip projects that already have memberRoles
          if (projectData.memberRoles) {
            skippedCount++;
            return;
          }
          
          // Create memberRoles for all members except owner
          const memberRoles = {};
          
          if (projectData.members && Array.isArray(projectData.members)) {
            projectData.members.forEach(memberId => {
              // Don't add owner to memberRoles (they have special status)
              if (memberId !== projectData.owner) {
                memberRoles[memberId] = ROLES.EDITOR; // Default to editor role
              }
            });
          }
          
          // Update project with memberRoles field
          await db.collection('projects').doc(projectDoc.id).update({
            memberRoles,
            updatedAt: FieldValue.serverTimestamp()
          });
          
          migratedCount++;
          console.log(`Migrated project ${projectDoc.id}: ${Object.keys(memberRoles).length} member roles added`);
          
        } catch (error) {
          errorCount++;
          console.error(`Error migrating project ${projectDoc.id}:`, error);
        }
      }));
    }
    
    const result = {
      success: true,
      totalProjects: projects.length,
      migratedCount,
      skippedCount,
      errorCount,
      message: `Migration completed: ${migratedCount} projects migrated, ${skippedCount} skipped, ${errorCount} errors`
    };
    
    console.log('Migration completed:', result);
    
    return result;
  } catch (error) {
    console.error('Migration failed:', error);
    throw new HttpsError('internal', 'Migration failed: ' + error.message);
  }
});

// Invite user to project - RBAC enforced
exports.inviteUserToProject = onCall(async (request) => {
  console.log('🚀 inviteUserToProject called with:', { projectId: request.data?.projectId, email: request.data?.email, role: request.data?.role });
  
  const userId = validateAuth(request);
  console.log('✅ User authenticated:', userId);
  
  const { projectId, email, role = 'editor' } = request.data;
  
  if (!projectId || !email) {
    console.log('❌ Missing required fields:', { projectId, email });
    throw new HttpsError('invalid-argument', 'Project ID and email are required');
  }
  
  // Validate role input
  validateRole(role);
  
  const db = admin.firestore();
  
  try {
    // Validate project access and permission to invite members
    const projectData = await validateProjectPermission(db, projectId, userId, PERMISSIONS.INVITE_MEMBERS);
    
    // Additional security: Only owner and admin can invite admins
    const actorRole = getUserRole(projectData, userId);
    if (role === ROLES.ADMIN && actorRole !== ROLES.OWNER) {
      throw new HttpsError('permission-denied', 'Only project owner can invite admins');
    }

    // Check if an invitation has already been sent to this email for this project
    const existingInvitation = await db.collection('invitations')
      .where('projectId', '==', projectId)
      .where('inviteeEmail', '==', email.toLowerCase())
      .where('status', '==', 'pending')
      .get();
    if (!existingInvitation.empty) {
      throw new HttpsError('already-exists', 'An invitation has already been sent to this email for this project.');
    }
    
    // Check if user already exists in Firebase Auth by email
    let inviteeUser;
    try {
      console.log('🔍 Looking up user by email:', email);
      inviteeUser = await admin.auth().getUserByEmail(email);
      console.log('✅ User found:', inviteeUser.uid);
    } catch (error) {
      console.log('❌ User not found in Firebase Auth:', error.code);
      // User doesn't exist in Firebase Auth yet
      inviteeUser = null;
    }
    
    // Check if user is already a member
    if (inviteeUser && projectData.members.includes(inviteeUser.uid)) {
      throw new HttpsError('already-exists', 'User is already a member of this project');
    }
    
    // Create invitation with deterministic ID to prevent race conditions
    console.log('📝 Creating invitation document...');
    const invitationId = `${projectId}_${email.toLowerCase().replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`;
    const invitationRef = db.collection('invitations').doc(invitationId);
    const expirationDate = new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)); // 7 days from now
    
    const invitationData = {
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
    };
    
    console.log('💾 Invitation data:', invitationData);
    await invitationRef.set(invitationData);
    console.log('✅ Invitation created successfully with ID:', invitationRef.id);
    
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
      
      // Add user to members array and set their role in memberRoles
      const updates = {
        members: FieldValue.arrayUnion(userId),
        updatedAt: FieldValue.serverTimestamp()
      };
      
      // Add user role to memberRoles (don't add owner to memberRoles)
      if (userId !== projectData.owner) {
        updates[`memberRoles.${userId}`] = invitation.role || ROLES.EDITOR;
      }
      
      transaction.update(projectRef, updates);
      
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

// Decline project invitation
exports.declineProjectInvitation = onCall(async (request) => {
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
    
    // Update invitation status to declined
    await invitationDoc.ref.update({
      status: 'declined',
      declinedAt: FieldValue.serverTimestamp(),
      inviteeUserId: userId
    });
    
    return { success: true, message: 'Invitation declined successfully' };
  } catch (error) {
    console.error('Error declining invitation:', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', 'Failed to decline invitation');
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
        // Convert timestamps to ISO strings for consistent client-side handling
        createdAt: (data.createdAt?.toDate?.() || new Date()).toISOString(),
        expiresAt: (data.expiresAt?.toDate?.() || new Date(Date.now() + (7 * 24 * 60 * 60 * 1000))).toISOString()
      });
    });
    
    return Array.from(invitationMap.values());
  } catch (error) {
    console.error('Error getting invitations:', error);
    throw new HttpsError('internal', 'Failed to get invitations');
  }
});

// Get project members details (for UI display) - RBAC enforced
exports.getProjectMembers = onCall(async (request) => {
  const userId = validateAuth(request);
  const { projectId, memberIds } = request.data;
  
  if (!projectId || !memberIds || !Array.isArray(memberIds)) {
    throw new HttpsError('invalid-argument', 'Project ID and member IDs array are required');
  }
  
  const db = admin.firestore();
  
  try {
    // Validate user has access to this project
    await validateProjectAccess(db, projectId, userId);
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

// Change user role in project
exports.changeUserRole = onCall(async (request) => {
  const userId = validateAuth(request);
  const { projectId, targetUserId, newRole } = request.data;
  
  if (!projectId || !targetUserId || !newRole) {
    throw new HttpsError('invalid-argument', 'Project ID, target user ID, and new role are required');
  }
  
  // Validate role input
  validateRole(newRole);
  
  if (userId === targetUserId) {
    throw new HttpsError('invalid-argument', 'Cannot change your own role');
  }
  
  const db = admin.firestore();
  
  try {
    // Validate project access
    const projectData = await validateProjectAccess(db, projectId, userId);
    
    // Check if actor has permission to manage roles
    if (!hasPermission(projectData, userId, PERMISSIONS.REMOVE_MEMBERS)) {
      throw new HttpsError('permission-denied', 'Insufficient permissions to change user roles');
    }
    
    // Get actor and target roles
    const { getUserRole, canModifyRole } = require('./middleware/auth');
    const actorRole = getUserRole(projectData, userId);
    const targetRole = getUserRole(projectData, targetUserId);
    
    if (!targetRole) {
      throw new HttpsError('not-found', 'Target user is not a member of this project');
    }
    
    // Validate role change permissions
    if (!canModifyRole(actorRole, targetRole, newRole)) {
      throw new HttpsError('permission-denied', 'Cannot change this user\'s role to the specified role');
    }
    
    // Cannot change owner role
    if (projectData.owner === targetUserId) {
      throw new HttpsError('permission-denied', 'Cannot change owner role');
    }
    
    // Update user role
    await db.runTransaction(async (transaction) => {
      const projectRef = db.collection('projects').doc(projectId);
      
      transaction.update(projectRef, {
        [`memberRoles.${targetUserId}`]: newRole,
        updatedAt: FieldValue.serverTimestamp()
      });
      
      // Log the change for audit
      const auditLogRef = db.collection('audit_logs').doc();
      transaction.set(auditLogRef, {
        action: 'role_changed',
        projectId,
        actorUserId: userId,
        targetUserId,
        oldRole: targetRole,
        newRole,
        timestamp: FieldValue.serverTimestamp()
      });
    });
    
    return { 
      success: true, 
      message: `User role changed from ${targetRole} to ${newRole}` 
    };
  } catch (error) {
    console.error('Error changing user role:', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', 'Failed to change user role');
  }
});

// Enhanced remove project member (replaces original removeProjectMember)
exports.removeProjectMemberSecure = onCall(async (request) => {
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
    // Validate project access and permission
    const projectData = await validateProjectAccess(db, projectId, userId);
    
    // Check if actor has permission to remove members
    if (!hasPermission(projectData, userId, PERMISSIONS.REMOVE_MEMBERS)) {
      throw new HttpsError('permission-denied', 'Insufficient permissions to remove members');
    }
    
    // Cannot remove owner
    if (projectData.owner === memberUserId) {
      throw new HttpsError('permission-denied', 'Cannot remove project owner');
    }
    
    // Check if user is actually a member
    if (!projectData.members.includes(memberUserId)) {
      throw new HttpsError('not-found', 'User is not a member of this project');
    }
    
    // Get member role for audit log
    const { getUserRole } = require('./middleware/auth');
    const memberRole = getUserRole(projectData, memberUserId);
    
    // Remove user from project
    await db.runTransaction(async (transaction) => {
      const projectRef = db.collection('projects').doc(projectId);
      
      const updates = {
        members: FieldValue.arrayRemove(memberUserId),
        updatedAt: FieldValue.serverTimestamp()
      };
      
      // Remove from memberRoles if present
      if (projectData.memberRoles && projectData.memberRoles[memberUserId]) {
        updates[`memberRoles.${memberUserId}`] = FieldValue.delete();
      }
      
      transaction.update(projectRef, updates);
      
      // Log the removal for audit
      const auditLogRef = db.collection('audit_logs').doc();
      transaction.set(auditLogRef, {
        action: 'member_removed',
        projectId,
        actorUserId: userId,
        targetUserId: memberUserId,
        removedRole: memberRole,
        timestamp: FieldValue.serverTimestamp()
      });
    });
    
    return { success: true, message: 'Member removed successfully' };
  } catch (error) {
    console.error('Error removing member:', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', 'Failed to remove member');
  }
});