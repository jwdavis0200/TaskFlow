const { onCall, HttpsError } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const { validateAuth, validateProjectAccess, validateProjectPermission, PERMISSIONS } = require('./middleware/auth');
const { FieldValue, Timestamp } = require('firebase-admin/firestore');
const { v5: uuidv5 } = require('uuid');

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
        timeSpent: taskData.timeSpent || 0,
        // Ensure attachments array exists
        attachments: taskData.attachments || []
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
    // Validate user has permission to edit tasks
    await validateProjectPermission(db, projectId, userId, PERMISSIONS.EDIT_TASKS);
    
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
      attachments: [], // Initialize empty attachments array
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
      dueDate: createdTaskData.dueDate ? createdTaskData.dueDate.toDate().toISOString() : null,
      // Ensure attachments array is included
      attachments: createdTaskData.attachments || []
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
    
    // Validate user has permission to edit tasks
    const taskData = taskDoc.data();
    await validateProjectPermission(db, taskData.projectId, userId, PERMISSIONS.EDIT_TASKS);
    
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
      updatedAt: updatedTaskData.updatedAt?.toDate() || null,
      // Ensure attachments array is included
      attachments: updatedTaskData.attachments || []
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
    
    // Validate user has permission to edit tasks
    await validateProjectPermission(db, taskData.projectId, userId, PERMISSIONS.EDIT_TASKS);
    
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
    await validateProjectPermission(db, taskData.projectId, userId, PERMISSIONS.EDIT_TASKS);
    
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
    await validateProjectPermission(db, taskData.projectId, userId, PERMISSIONS.EDIT_TASKS);
    
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

/**
 * Generate signed upload URL for task attachment
 */
exports.generateAttachmentUploadURL = onCall(async (request) => {
  const startTime = Date.now();
  
  try {
    const userId = validateAuth(request);
    const { taskId, fileName, fileSize, mimeType } = request.data;
    
    // Enhanced input validation with detailed error messages
    const errors = [];
    if (!taskId) errors.push('Task ID is required');
    if (!fileName) errors.push('File name is required');
    if (!fileSize || typeof fileSize !== 'number') errors.push('Valid file size is required');
    if (!mimeType) errors.push('MIME type is required');
    
    if (errors.length > 0) {
      console.error('generateAttachmentUploadURL: Input validation failed:', {
        userId,
        taskId,
        fileName,
        fileSize,
        mimeType,
        errors
      });
      throw new HttpsError('invalid-argument', `Invalid input: ${errors.join(', ')}`);
    }
    
    // Validate file size (10MB limit)
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    if (fileSize > MAX_FILE_SIZE) {
      console.error('generateAttachmentUploadURL: File size exceeded:', {
        userId,
        taskId,
        fileName,
        fileSize,
        maxSize: MAX_FILE_SIZE
      });
      throw new HttpsError('invalid-argument', `File size ${Math.round(fileSize / 1024 / 1024)}MB exceeds 10MB limit`);
    }
    
    // Validate MIME type
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain', 'text/csv'
    ];
    
    if (!allowedTypes.includes(mimeType)) {
      console.error('generateAttachmentUploadURL: Invalid MIME type:', {
        userId,
        taskId,
        fileName,
        mimeType,
        allowedTypes
      });
      throw new HttpsError('invalid-argument', `File type ${mimeType} is not supported`);
    }
    
    console.log('generateAttachmentUploadURL: Starting upload URL generation:', {
      userId,
      taskId,
      fileName,
      fileSize: `${Math.round(fileSize / 1024)}KB`,
      mimeType
    });
    
    const db = admin.firestore();
    
    // Get task and validate permissions
    const taskRef = db.collection('tasks').doc(taskId);
    const taskDoc = await taskRef.get();
    
    if (!taskDoc.exists) {
      console.error('generateAttachmentUploadURL: Task not found:', { taskId, userId });
      throw new HttpsError('not-found', 'Task not found');
    }
    
    const taskData = taskDoc.data();
    
    try {
      await validateProjectPermission(db, taskData.projectId, userId, PERMISSIONS.EDIT_TASKS);
    } catch (permissionError) {
      console.error('generateAttachmentUploadURL: Permission denied:', {
        userId,
        taskId,
        projectId: taskData.projectId,
        error: permissionError.message
      });
      throw permissionError;
    }
    
    // Check attachment limits
    const existingAttachments = taskData.attachments || [];
    if (existingAttachments.length >= 5) {
      console.error('generateAttachmentUploadURL: Attachment limit exceeded:', {
        userId,
        taskId,
        existingCount: existingAttachments.length,
        limit: 5
      });
      throw new HttpsError('failed-precondition', 'Maximum 5 attachments per task allowed');
    }
    
    // Generate deterministic UUID based on task and file info
    const namespace = '6ba7b810-9dad-11d1-80b4-00c04fd430c8'; // Standard namespace
    const attachmentId = uuidv5(`${taskId}-${fileName}-${Date.now()}`, namespace);
    
    // Create storage path
    const fileExtension = fileName.split('.').pop()?.toLowerCase() || 'bin';
    const storagePath = `tasks/${taskId}/attachments/${attachmentId}.${fileExtension}`;
    
    // Environment detection
    const isEmulator = process.env.FUNCTIONS_EMULATOR === 'true' || 
                       process.env.FIREBASE_STORAGE_EMULATOR_HOST;
    
    console.log('generateAttachmentUploadURL: Environment and storage details:', {
      environment: isEmulator ? 'emulator' : 'production',
      attachmentId,
      storagePath,
      projectId: taskData.projectId
    });
    
    const bucket = admin.storage().bucket('taskflow-production.firebasestorage.app');
    const file = bucket.file(storagePath);
    
    if (isEmulator) {
      // Emulator: Use direct Storage SDK upload (signed URLs don't work in emulator)
      const result = {
        attachmentId,
        storagePath,
        useDirectUpload: true
      };
      
      console.log('generateAttachmentUploadURL: Emulator response generated:', {
        ...result,
        duration: `${Date.now() - startTime}ms`
      });
      
      return result;
    } else {
      // Production: Generate signed upload URL for secure direct uploads
      try {
        const [signedUrl] = await file.getSignedUrl({
          version: 'v4',
          action: 'write',
          expires: Date.now() + 60 * 60 * 1000, // 1 hour
          contentType: mimeType,
        });
        
        const result = {
          uploadUrl: signedUrl,
          attachmentId,
          storagePath,
          useDirectUpload: false
        };
        
        console.log('generateAttachmentUploadURL: Production response generated:', {
          attachmentId,
          storagePath,
          signedUrlGenerated: !!signedUrl,
          duration: `${Date.now() - startTime}ms`
        });
        
        return result;
      } catch (signedUrlError) {
        console.error('generateAttachmentUploadURL: Failed to generate signed URL:', {
          userId,
          taskId,
          storagePath,
          error: signedUrlError.message,
          errorCode: signedUrlError.code,
          errorStack: signedUrlError.stack,
          duration: `${Date.now() - startTime}ms`
        });
        
        // Enhanced error message based on common issues
        let errorMessage = 'Failed to generate upload URL';
        if (signedUrlError.message.includes('serviceAccounts.signBlob')) {
          errorMessage = 'Service account permissions issue. Cloud Functions service account needs Service Account Token Creator role.';
        } else if (signedUrlError.message.includes('IAM API')) {
          errorMessage = 'IAM API not enabled for this project.';
        } else if (signedUrlError.message.includes('client_email')) {
          errorMessage = 'Firebase Admin SDK initialization issue.';
        }
        
        throw new HttpsError('internal', errorMessage);
      }
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    
    if (error instanceof HttpsError) {
      console.error('generateAttachmentUploadURL: Known error:', {
        code: error.code,
        message: error.message,
        duration: `${duration}ms`
      });
      throw error;
    }
    
    console.error('generateAttachmentUploadURL: Unexpected error:', {
      error: error.message,
      stack: error.stack,
      duration: `${duration}ms`
    });
    throw new HttpsError('internal', 'An unexpected error occurred while generating upload URL');
  }
});

/**
 * Confirm attachment upload and update task
 */
exports.confirmAttachmentUpload = onCall(async (request) => {
  const userId = validateAuth(request);
  const { taskId, attachmentId, fileName, fileSize, mimeType, storagePath } = request.data;
  
  if (!taskId || !attachmentId || !fileName || !fileSize || !mimeType || !storagePath) {
    throw new HttpsError('invalid-argument', 'All attachment details are required');
  }
  
  const db = admin.firestore();
  
  try {
    // Get task and validate permissions
    const taskRef = db.collection('tasks').doc(taskId);
    const taskDoc = await taskRef.get();
    
    if (!taskDoc.exists) {
      throw new HttpsError('not-found', 'Task not found');
    }
    
    const taskData = taskDoc.data();
    await validateProjectPermission(db, taskData.projectId, userId, PERMISSIONS.EDIT_TASKS);
    
    // Environment detection
    const isEmulator = process.env.FUNCTIONS_EMULATOR === 'true' || 
                       process.env.FIREBASE_STORAGE_EMULATOR_HOST;
    
    console.log(`Confirming attachment upload for: ${fileName} (${isEmulator ? 'emulator' : 'production'})`);
    
    const bucket = admin.storage().bucket('taskflow-production.firebasestorage.app');
    const file = bucket.file(storagePath);
    
    let downloadURL = null;
    
    if (isEmulator) {
      // Emulator: Skip file verification due to known emulator limitations
      downloadURL = `gs://taskflow-pro-dev.appspot.com/${storagePath}`;
      console.log('Emulator mode: Skipping file verification');
    } else {
      // Production: Verify file exists and generate signed download URL
      try {
        console.log('Production mode: Verifying file existence and generating download URL');
        
        // Verify file exists
        const [metadata] = await file.getMetadata();
        console.log('File verified:', metadata.name);
        
        // Generate signed download URL (valid for 7 days)
        const [signedUrl] = await file.getSignedUrl({
          version: 'v4',
          action: 'read',
          expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
        });
        
        downloadURL = signedUrl;
      } catch (error) {
        if (error.code === 404) {
          throw new HttpsError('not-found', 'Uploaded file not found in storage');
        }
        console.error('File verification error:', error);
        throw new HttpsError('internal', 'Failed to verify uploaded file');
      }
    }
    
    // Create attachment metadata
    const attachment = {
      id: attachmentId,
      fileName,
      fileSize,
      mimeType,
      storagePath,
      downloadURL,
      uploadedAt: new Date().toISOString(), // Use ISO string instead of FieldValue.serverTimestamp() for arrays
      uploadedBy: userId,
    };
    
    // Add attachment to task
    await taskRef.update({
      attachments: FieldValue.arrayUnion(attachment),
      updatedAt: FieldValue.serverTimestamp(),
    });
    
    return { success: true, attachment };
  } catch (error) {
    console.error('Error confirming attachment upload:', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', 'Failed to confirm attachment upload');
  }
});

/**
 * Delete task attachment
 */
exports.deleteTaskAttachment = onCall(async (request) => {
  const userId = validateAuth(request);
  const { taskId, attachmentId } = request.data;
  
  if (!taskId || !attachmentId) {
    throw new HttpsError('invalid-argument', 'Task ID and attachment ID are required');
  }
  
  const db = admin.firestore();
  
  try {
    // Get task and validate permissions
    const taskRef = db.collection('tasks').doc(taskId);
    const taskDoc = await taskRef.get();
    
    if (!taskDoc.exists) {
      throw new HttpsError('not-found', 'Task not found');
    }
    
    const taskData = taskDoc.data();
    await validateProjectPermission(db, taskData.projectId, userId, PERMISSIONS.EDIT_TASKS);
    
    // Find attachment to delete
    const attachments = taskData.attachments || [];
    const attachmentToDelete = attachments.find(att => att.id === attachmentId);
    
    if (!attachmentToDelete) {
      throw new HttpsError('not-found', 'Attachment not found');
    }
    
    // Delete file from storage
    const bucket = admin.storage().bucket('taskflow-production.firebasestorage.app');
    const file = bucket.file(attachmentToDelete.storagePath);
    
    try {
      await file.delete();
    } catch (storageError) {
      console.warn('File not found in storage or already deleted:', storageError);
    }
    
    // Remove attachment from task
    await taskRef.update({
      attachments: FieldValue.arrayRemove(attachmentToDelete),
      updatedAt: FieldValue.serverTimestamp(),
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error deleting attachment:', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', 'Failed to delete attachment');
  }
});

/**
 * Generate fresh download URL for attachment
 */
exports.getAttachmentDownloadURL = onCall(async (request) => {
  const userId = validateAuth(request);
  const { taskId, attachmentId } = request.data;
  
  if (!taskId || !attachmentId) {
    throw new HttpsError('invalid-argument', 'Task ID and attachment ID are required');
  }
  
  const db = admin.firestore();
  
  try {
    // Get task and validate permissions
    const taskRef = db.collection('tasks').doc(taskId);
    const taskDoc = await taskRef.get();
    
    if (!taskDoc.exists) {
      throw new HttpsError('not-found', 'Task not found');
    }
    
    const taskData = taskDoc.data();
    await validateProjectPermission(db, taskData.projectId, userId, PERMISSIONS.EDIT_TASKS);
    
    // Find attachment
    const attachments = taskData.attachments || [];
    const attachment = attachments.find(att => att.id === attachmentId);
    
    if (!attachment) {
      throw new HttpsError('not-found', 'Attachment not found');
    }
    
    // Environment detection
    const isEmulator = process.env.FUNCTIONS_EMULATOR === 'true' || 
                       process.env.FIREBASE_STORAGE_EMULATOR_HOST;
    
    console.log(`Generating download URL for: ${attachment.fileName} (${isEmulator ? 'emulator' : 'production'})`);
    
    if (isEmulator) {
      // Emulator: Return existing downloadURL from attachment metadata
      // (Signed URL generation fails in emulator due to missing service account)
      if (attachment.downloadURL) {
        return { downloadUrl: attachment.downloadURL };
      } else {
        throw new HttpsError('internal', 'No download URL available for this attachment');
      }
    } else {
      // Production: Generate fresh signed download URL for security
      try {
        const bucket = admin.storage().bucket('taskflow-production.firebasestorage.app');
        const file = bucket.file(attachment.storagePath);
        
        const [downloadUrl] = await file.getSignedUrl({
          version: 'v4',
          action: 'read',
          expires: Date.now() + 60 * 60 * 1000, // 1 hour
        });
        
        return { downloadUrl };
      } catch (error) {
        console.error('Failed to generate signed download URL:', error);
        throw new HttpsError('internal', 'Failed to generate download URL');
      }
    }
  } catch (error) {
    console.error('Error generating download URL:', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', 'Failed to generate download URL');
  }
});