const { onCall, HttpsError } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const { validateAuth, validateProjectAccess } = require('./middleware/auth');
const { FieldValue } = require('firebase-admin/firestore');

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