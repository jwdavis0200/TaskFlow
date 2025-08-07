import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase/config';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase/config';
import { Image, FilePdf, FileDoc, FileText, Paperclip } from '@phosphor-icons/react';

/**
 * File validation utilities
 */
export const ALLOWED_FILE_TYPES = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'application/pdf': '.pdf',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'text/plain': '.txt',
  'text/csv': '.csv'
};

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const MAX_FILES_PER_TASK = 5;

/**
 * Validate a file before upload
 */
export const validateFile = (file) => {
  const errors = [];
  
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    errors.push(`File "${file.name}" is too large. Maximum size is 10MB.`);
  }
  
  // Check file type
  if (!ALLOWED_FILE_TYPES[file.type]) {
    errors.push(`File type "${file.type}" is not supported.`);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validate multiple files
 */
export const validateFiles = (files, existingAttachments = []) => {
  const errors = [];
  const validFiles = [];
  
  // Check total file count
  const totalFiles = files.length + existingAttachments.length;
  if (totalFiles > MAX_FILES_PER_TASK) {
    errors.push(`Too many files. Maximum ${MAX_FILES_PER_TASK} files per task.`);
    return { isValid: false, errors, validFiles: [] };
  }
  
  // Validate each file
  files.forEach(file => {
    const validation = validateFile(file);
    if (validation.isValid) {
      validFiles.push(file);
    } else {
      errors.push(...validation.errors);
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors,
    validFiles
  };
};

/**
 * Format file size for display
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];

  // Calculate index for appropriate sizes[i] for the current file size
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

/**
 * Get file type icon component, return phospor functions
 */
export const getFileIcon = (mimeType) => {
  if (mimeType.startsWith('image/')) return Image;
  if (mimeType === 'application/pdf') return FilePdf;
  if (mimeType.includes('word') || mimeType.includes('document')) return FileDoc;
  if (mimeType.startsWith('text/')) return FileText;
  return Paperclip;
};

/**
 * Upload file with progress tracking
 */
export const uploadTaskAttachment = async (taskId, file, onProgress) => {
  try {
    console.log(`Starting upload for ${file.name} (${formatFileSize(file.size)})`);
    
    // Step 1: Generate upload URL or get direct upload info
    const generateUploadURL = httpsCallable(functions, 'generateAttachmentUploadURL');
    const urlResult = await generateUploadURL({
      taskId,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type
    });
    
    const { attachmentId, storagePath, useDirectUpload, uploadUrl } = urlResult.data;
    
    if (useDirectUpload) {
      // Emulator: Upload directly using Firebase Storage SDK
      console.log('Using direct Storage SDK upload (emulator mode)');
      return uploadWithStorageSDK(taskId, file, attachmentId, storagePath, onProgress);
    } else {
      // Production: Upload using signed URL
      console.log('Using signed URL upload (production mode)');
      return uploadWithSignedURL(taskId, file, attachmentId, storagePath, uploadUrl, onProgress);
    }
  } catch (error) {
    console.error('Upload initialization error:', error);
    throw new Error(`Failed to initialize upload for ${file.name}: ${error.message}`);
  }
};

/**
 * Upload using Firebase Storage SDK (for emulator)
 */
const uploadWithStorageSDK = async (taskId, file, attachmentId, storagePath, onProgress) => {
  const storageRef = ref(storage, storagePath);
  const uploadTask = uploadBytesResumable(storageRef, file);
  
  return new Promise((resolve, reject) => {
    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        if (onProgress) {
          onProgress(progress, attachmentId);
        }
      },
      (error) => {
        console.error('Storage SDK upload error:', error);
        reject(error);
      },
      async () => {
        console.log('Upload completed, attempting to confirm...');
        
        try {
          // Try to call the confirmation function
          console.log('Calling confirmAttachmentUpload with:', {
            taskId, attachmentId, fileName: file.name, fileSize: file.size, mimeType: file.type, storagePath
          });
          
          const confirmUpload = httpsCallable(functions, 'confirmAttachmentUpload');
          const confirmResult = await confirmUpload({
            taskId,
            attachmentId,
            fileName: file.name,
            fileSize: file.size,
            mimeType: file.type,
            storagePath
          });
          
          console.log('Confirmation successful:', confirmResult.data);
          
          resolve({
            attachmentId,
            attachment: confirmResult.data.attachment
          });
        } catch (confirmError) {
          console.error('Confirmation failed, but file uploaded:', confirmError);
          
          // Fall back to client-side metadata since upload succeeded locally
          resolve({
            attachmentId,
            attachment: {
              id: attachmentId,
              fileName: file.name,
              fileSize: file.size,
              mimeType: file.type,
              storagePath,
              uploadedAt: new Date().toISOString()
            }
          });
        }
      }
    );
  });
};

/**
 * Upload using signed URL (for production)
 */
const uploadWithSignedURL = async (taskId, file, attachmentId, storagePath, uploadUrl, onProgress) => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    
    // Track upload progress
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onProgress) {
        const progress = (event.loaded / event.total) * 100;
        onProgress(progress, attachmentId);
      }
    });
    
    xhr.addEventListener('load', async () => {
      if (xhr.status === 200) {
        try {
          // Confirm upload with backend
          const confirmUpload = httpsCallable(functions, 'confirmAttachmentUpload');
          const confirmResult = await confirmUpload({
            taskId,
            attachmentId,
            fileName: file.name,
            fileSize: file.size,
            mimeType: file.type,
            storagePath
          });
          
          resolve({
            attachmentId,
            attachment: confirmResult.data.attachment
          });
        } catch (confirmError) {
          console.error('Upload confirmation error:', confirmError);
          reject(confirmError);
        }
      } else {
        reject(new Error(`Upload failed with status: ${xhr.status}`));
      }
    });
    
    xhr.addEventListener('error', () => {
      reject(new Error('Upload failed'));
    });
    
    // Upload to signed URL
    xhr.open('PUT', uploadUrl);
    xhr.setRequestHeader('Content-Type', file.type);
    xhr.send(file);
  });
};

/**
 * Delete task attachment
 */
export const deleteTaskAttachment = async (taskId, attachmentId) => {
  try {
    const deleteAttachment = httpsCallable(functions, 'deleteTaskAttachment');
    const result = await deleteAttachment({ taskId, attachmentId });
    return result.data;
  } catch (error) {
    console.error('Delete attachment error:', error);
    throw error;
  }
};

/**
 * Get fresh download URL for attachment
 */
export const getAttachmentDownloadURL = async (taskId, attachmentId) => {
  try {
    const getDownloadURL = httpsCallable(functions, 'getAttachmentDownloadURL');
    const result = await getDownloadURL({ taskId, attachmentId });
    return result.data.downloadUrl;
  } catch (error) {
    console.error('Get download URL error:', error);
    throw error;
  }
};

/**
 * Download attachment file
 */
export const downloadAttachment = async (taskId, attachmentId, fileName) => {
  try {
    console.log(`Starting download for ${fileName}`);
    
    // Check if running in emulator environment
    const isEmulator = import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true';
    
    if (isEmulator) {
      console.log('Using direct Storage SDK download (emulator mode)');
      
      // Direct download using Storage SDK for emulator
      const fileExtension = fileName.split('.').pop();
      const storagePath = `tasks/${taskId}/attachments/${attachmentId}.${fileExtension}`;
      const storageRef = ref(storage, storagePath);
      
      try {
        const downloadURL = await getDownloadURL(storageRef);
        
        // Create a temporary link to trigger download
        const link = document.createElement('a');
        link.href = downloadURL;
        link.download = fileName;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        console.log(`Download initiated for ${fileName}`);
      } catch (error) {
        console.error('Direct storage download failed:', error);
        
        // Fallback: Try Cloud Function approach even in emulator
        console.log('Attempting Cloud Function fallback...');
        try {
          const downloadUrl = await getAttachmentDownloadURL(taskId, attachmentId);
          
          const link = document.createElement('a');
          link.href = downloadUrl;
          link.download = fileName;
          
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          console.log(`Fallback download initiated for ${fileName}`);
        } catch (fallbackError) {
          throw new Error(`Both direct storage and Cloud Function download failed: ${fallbackError.message}`);
        }
      }
    } else {
      console.log('Using Cloud Function download (production mode)');
      
      // Production: Use signed URLs via Cloud Function
      try {
        const downloadUrl = await getAttachmentDownloadURL(taskId, attachmentId);
        
        // Create a temporary link to trigger download
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = fileName;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        console.log(`Production download initiated for ${fileName}`);
      } catch (error) {
        console.error('Production download failed:', error);
        throw new Error(`Failed to download ${fileName}: ${error.message}`);
      }
    }
  } catch (error) {
    console.error('Download error:', error);
    throw error;
  }
};

/**
 * Upload multiple files with progress tracking
 */
export const uploadMultipleAttachments = async (taskId, files, onProgress, onFileComplete) => {
  const results = [];
  const errors = [];
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    
    try {
      const result = await uploadTaskAttachment(
        taskId,
        file,
        (progress, attachmentId) => {
          if (onProgress) {
            onProgress(i, progress, attachmentId, file.name);
          }
        }
      );
      
      results.push(result);
      
      if (onFileComplete) {
        onFileComplete(i, result, null);
      }
    } catch (error) {
      errors.push({ file: file.name, error });
      
      if (onFileComplete) {
        onFileComplete(i, null, error);
      }
    }
  }
  
  return { results, errors };
};