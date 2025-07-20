const { onCall, HttpsError } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const { validateAuth, validateProjectAccess } = require('./middleware/auth');
const { FieldValue, Timestamp } = require('firebase-admin/firestore');

/**
 * Get tasks with optional filtering
 */
exports.getTasks = onCall(async (request) => {
  const userId = validateAuth(request);
  const { projectId, boardId, columnId } = request.data;
  
  const db = admin.firestore();
  
  try {
    // If projectId provided, validate access
    if (projectId) {
      await validateProjectAccess(db, projectId, userId);
    }
    
    // Build query based on provided filters
    let query = db.collection('tasks');
    
    if (projectId) query = query.where('projectId', '==', projectId);
    if (boardId) query = query.where('boardId', '==', boardId);
    if (columnId) query = query.where('columnId', '==', columnId);
    
    const tasksSnapshot = await query.orderBy('createdAt').get();
    
    // Apply date handling pattern with proper serialization for frontend
    const tasks = tasksSnapshot.docs.map(doc => {
      const taskData = doc.data();
      return {
        id: doc.id,
        ...taskData,
        // Ensure dates are properly serialized for frontend
        createdAt: taskData.createdAt?.toDate?.() || null,
        updatedAt: taskData.updatedAt?.toDate?.() || null,
        dueDate: taskData.dueDate ? taskData.dueDate.toDate().toISOString() : null,
        // Ensure timeSpent is preserved as number
        timeSpent: taskData.timeSpent || 0
      };
    });
    
    return tasks;
  } catch (error) {
    console.error('Error getting tasks:', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', 'Failed to get tasks');
  }
});

/**
 * Create a new task
 */
exports.createTask = onCall(async (request) => {
  const userId = validateAuth(request);
  const { projectId, boardId, columnId, title, description, dueDate, priority } = request.data;
  
  if (!projectId || !boardId || !columnId || !title) {
    throw new HttpsError('invalid-argument', 'Project ID, Board ID, Column ID, and title are required');
  }
  
  const db = admin.firestore();
  
  try {
    // Validate user has access to project
    await validateProjectAccess(db, projectId, userId);
    
    const taskRef = db.collection('tasks').doc();
    
    // Create task data with proper timestamp handling
    const taskData = {
      title,
      description: description || '',
      projectId,
      boardId,
      columnId,
      assignedTo: userId,
      priority: priority || 'medium',
      timeSpent: 0, // Initialize timeSpent to 0
      isRunning: false,
      isCompleted: false,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    };
    
    // Handle dueDate conversion properly
    if (dueDate) {
      const date = new Date(dueDate);
      if (!isNaN(date.getTime())) {
        taskData.dueDate = Timestamp.fromDate(date);
      }
    }
    
    await taskRef.set(taskData);
    
    // Update column's tasks array
    await db.collection('columns').doc(columnId).update({
      tasks: FieldValue.arrayUnion(taskRef.id),
      updatedAt: FieldValue.serverTimestamp()
    });
    
    // Get the created task with proper date handling for immediate UI update
    const createdTaskDoc = await taskRef.get();
    const createdTaskData = createdTaskDoc.data();
    
    // Return complete task object for immediate UI updates
    return {
      id: taskRef.id,
      ...createdTaskData,
      // Convert Firestore timestamps to Date objects for frontend compatibility
      createdAt: createdTaskData.createdAt?.toDate(),
      updatedAt: createdTaskData.updatedAt?.toDate(),
      // Convert dueDate to ISO string for consistent frontend handling
      dueDate: createdTaskData.dueDate ? createdTaskData.dueDate.toDate().toISOString() : null
    };
  } catch (error) {
    console.error('Error creating task:', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', 'Failed to create task');
  }
});

/**
 * Update a task
 */
exports.updateTask = onCall(async (request) => {
  const userId = validateAuth(request);
  const { taskId, updates } = request.data;
  
  if (!taskId) {
    throw new HttpsError('invalid-argument', 'Task ID is required');
  }
  
  const db = admin.firestore();
  
  try {
    const taskRef = db.collection('tasks').doc(taskId);
    const taskDoc = await taskRef.get();
    
    if (!taskDoc.exists) {
      throw new HttpsError('not-found', 'Task not found');
    }
    
    // Validate user has access to project
    const taskData = taskDoc.data();
    await validateProjectAccess(db, taskData.projectId, userId);
    
    // Prepare update data with proper timestamp handling
    const updateData = { ...updates };
    
    // Handle dueDate conversion properly
    if (Object.prototype.hasOwnProperty.call(updates, 'dueDate')) {
      if (updates.dueDate) {
        const date = new Date(updates.dueDate);
        if (!isNaN(date.getTime())) {
          updateData.dueDate = Timestamp.fromDate(date);
        } else {
          delete updateData.dueDate; // Do not update if invalid
        }
      } else {
        updateData.dueDate = null; // Allow clearing the date
      }
    }
    
    // Always update the updatedAt timestamp
    updateData.updatedAt = FieldValue.serverTimestamp();
    
    // Handle column changes
    if (updates.columnId && updates.columnId !== taskData.columnId) {
      await db.runTransaction(async (transaction) => {
        // Remove from old column
        transaction.update(db.collection('columns').doc(taskData.columnId), {
          tasks: FieldValue.arrayRemove(taskId)
        });
        
        // Add to new column
        transaction.update(db.collection('columns').doc(updates.columnId), {
          tasks: FieldValue.arrayUnion(taskId)
        });
        
        // Update task
        transaction.update(taskRef, updateData);
      });
    } else {
      // Simple update without column change
      await taskRef.update(updateData);
    }
    
    // Fetch the updated task and return with proper date serialization
    const updatedTaskDoc = await taskRef.get();
    const updatedTaskData = updatedTaskDoc.data();
    
    return {
      id: taskId,
      ...updatedTaskData,
      // Ensure dates are properly serialized for frontend
      dueDate: updatedTaskData.dueDate ? updatedTaskData.dueDate.toDate().toISOString() : null,
      createdAt: updatedTaskData.createdAt?.toDate() || null,
      updatedAt: updatedTaskData.updatedAt?.toDate() || null
    };
  } catch (error) {
    console.error('Error updating task:', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', 'Failed to update task');
  }
});

/**
 * Delete a task
 */
exports.deleteTask = onCall(async (request) => {
  const userId = validateAuth(request);
  const { taskId } = request.data;
  
  if (!taskId) {
    throw new HttpsError('invalid-argument', 'Task ID is required');
  }
  
  const db = admin.firestore();
  
  try {
    const taskRef = db.collection('tasks').doc(taskId);
    const taskDoc = await taskRef.get();
    
    if (!taskDoc.exists) {
      throw new HttpsError('not-found', 'Task not found');
    }
    
    const taskData = taskDoc.data();
    
    // Validate user has access to project
    await validateProjectAccess(db, taskData.projectId, userId);
    
    await db.runTransaction(async (transaction) => {
      // Remove task from column's tasks array
      transaction.update(db.collection('columns').doc(taskData.columnId), {
        tasks: FieldValue.arrayRemove(taskId),
        updatedAt: FieldValue.serverTimestamp()
      });
      
      // Delete task
      transaction.delete(taskRef);
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error deleting task:', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', 'Failed to delete task');
  }
});

/**
 * Start timer for a task
 */
exports.startTimer = onCall(async (request) => {
  const userId = validateAuth(request);
  const { taskId } = request.data;
  
  if (!taskId) {
    throw new HttpsError('invalid-argument', 'Task ID is required');
  }
  
  const db = admin.firestore();
  
  try {
    const taskRef = db.collection('tasks').doc(taskId);
    const taskDoc = await taskRef.get();
    
    if (!taskDoc.exists) {
      throw new HttpsError('not-found', 'Task not found');
    }
    
    const taskData = taskDoc.data();
    await validateProjectAccess(db, taskData.projectId, userId);
    
    await taskRef.update({
      isRunning: true,
      lastStartTime: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error starting timer:', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', 'Failed to start timer');
  }
});

/**
 * Stop timer for a task
 */
exports.stopTimer = onCall(async (request) => {
  const userId = validateAuth(request);
  const { taskId, timeElapsed } = request.data;
  
  if (!taskId || typeof timeElapsed !== 'number') {
    throw new HttpsError('invalid-argument', 'Task ID and time elapsed are required');
  }
  
  const db = admin.firestore();
  
  try {
    const taskRef = db.collection('tasks').doc(taskId);
    const taskDoc = await taskRef.get();
    
    if (!taskDoc.exists) {
      throw new HttpsError('not-found', 'Task not found');
    }
    
    const taskData = taskDoc.data();
    await validateProjectAccess(db, taskData.projectId, userId);
    
    const currentTimeSpent = taskData.timeSpent || 0;
    
    await taskRef.update({
      isRunning: false,
      timeSpent: currentTimeSpent + timeElapsed,
      lastStartTime: FieldValue.delete(),
      updatedAt: FieldValue.serverTimestamp()
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error stopping timer:', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', 'Failed to stop timer');
  }
});