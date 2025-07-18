const { onCall, HttpsError } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const { validateAuth, validateProjectAccess } = require('./middleware/auth');
const { FieldValue } = require('firebase-admin/firestore');

/**
 * Get boards for a project
 */
exports.getBoards = onCall(async (request) => {
  const userId = validateAuth(request);
  const { projectId } = request.data;
  
  if (!projectId) {
    throw new HttpsError('invalid-argument', 'Project ID is required');
  }
  
  const db = admin.firestore();
  
  try {
    // Validate user has access to project
    await validateProjectAccess(db, projectId, userId);
    
    // Get boards with populated columns and tasks
    const boardsSnapshot = await db.collection('boards').where('projectId', '==', projectId).get();
    
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
        
        // Apply date handling pattern from memories - convert dates properly
        columnData.tasks = tasksSnapshot.docs.map(taskDoc => {
          const taskData = taskDoc.data();
          return {
            id: taskDoc.id,
            ...taskData,
            createdAt: taskData.createdAt?.toDate?.(),
            updatedAt: taskData.updatedAt?.toDate?.(),
            // Convert dueDate to ISO string for consistent frontend handling
            dueDate: taskData.dueDate ? taskData.dueDate.toDate().toISOString() : null
          };
        });
        
        return columnData;
      }));
      
      boardData.columns = columns;
      return {
        ...boardData,
        createdAt: boardData.createdAt?.toDate?.(),
        updatedAt: boardData.updatedAt?.toDate?.()
      };
    }));
    
    return boards;
  } catch (error) {
    console.error('Error getting boards:', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', 'Failed to get boards');
  }
});

/**
 * Create a new board
 */
exports.createBoard = onCall(async (request) => {
  const userId = validateAuth(request);
  const { projectId, name } = request.data;
  
  if (!projectId || !name) {
    throw new HttpsError('invalid-argument', 'Project ID and board name are required');
  }
  
  const db = admin.firestore();
  
  try {
    // Validate user has access to project
    await validateProjectAccess(db, projectId, userId);
    
    // Create board + default columns atomically
    const result = await db.runTransaction(async (transaction) => {
      const boardRef = db.collection('boards').doc();
      
      // Create board
      transaction.set(boardRef, {
        name,
        projectId,
        columns: [],
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
          projectId,
          order: index,
          tasks: [],
          createdAt: FieldValue.serverTimestamp()
        });
      });
      
      // Update board with column IDs
      transaction.update(boardRef, { columns: columnIds });
      
      // Update project with board ID
      transaction.update(db.collection('projects').doc(projectId), {
        boards: FieldValue.arrayUnion(boardRef.id),
        updatedAt: FieldValue.serverTimestamp()
      });
      
      return { boardId: boardRef.id };
    });
    
    return result;
  } catch (error) {
    console.error('Error creating board:', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', 'Failed to create board');
  }
});

/**
 * Update a board
 */
exports.updateBoard = onCall(async (request) => {
  const userId = validateAuth(request);
  const { boardId, updates } = request.data;
  
  if (!boardId) {
    throw new HttpsError('invalid-argument', 'Board ID is required');
  }
  
  const db = admin.firestore();
  
  try {
    // Get board to validate project access
    const boardDoc = await db.collection('boards').doc(boardId).get();
    if (!boardDoc.exists) {
      throw new HttpsError('not-found', 'Board not found');
    }
    
    const boardData = boardDoc.data();
    await validateProjectAccess(db, boardData.projectId, userId);
    
    // Update board
    await db.collection('boards').doc(boardId).update({
      ...updates,
      updatedAt: FieldValue.serverTimestamp()
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error updating board:', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', 'Failed to update board');
  }
});

/**
 * Delete a board and all its related data
 */
exports.deleteBoard = onCall(async (request) => {
  const userId = validateAuth(request);
  const { boardId } = request.data;
  
  if (!boardId) {
    throw new HttpsError('invalid-argument', 'Board ID is required');
  }
  
  const db = admin.firestore();
  
  try {
    // Get board to validate project access
    const boardDoc = await db.collection('boards').doc(boardId).get();
    if (!boardDoc.exists) {
      throw new HttpsError('not-found', 'Board not found');
    }
    
    const boardData = boardDoc.data();
    await validateProjectAccess(db, boardData.projectId, userId);
    
    // Cascade delete: board → columns → tasks
    await db.runTransaction(async (transaction) => {
      // Delete all tasks in board
      const tasksSnapshot = await db.collection('tasks').where('boardId', '==', boardId).get();
      tasksSnapshot.docs.forEach(doc => transaction.delete(doc.ref));
      
      // Delete all columns in board
      const columnsSnapshot = await db.collection('columns').where('boardId', '==', boardId).get();
      columnsSnapshot.docs.forEach(doc => transaction.delete(doc.ref));
      
      // Remove board from project's boards array
      transaction.update(db.collection('projects').doc(boardData.projectId), {
        boards: FieldValue.arrayRemove(boardId),
        updatedAt: FieldValue.serverTimestamp()
      });
      
      // Delete board
      transaction.delete(db.collection('boards').doc(boardId));
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error deleting board:', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', 'Failed to delete board');
  }
});