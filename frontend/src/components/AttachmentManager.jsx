import { useState, useRef } from 'react';
import styled from '@emotion/styled';
import { useStore } from '../store';
import { 
  validateFiles, 
  formatFileSize, 
  getFileIcon,
  uploadTaskAttachment,
  deleteTaskAttachment,
  downloadAttachment
} from '../services/storage';

// Styled components
const AttachmentContainer = styled.div`
  border: 2px dashed #e0e0e0;
  border-radius: 8px;
  padding: 12px;
  transition: all 0.3s ease;
  
  &:hover {
    border-color: #667eea;
    background: #f8f9ff;
  }
  
  &.dragover {
    border-color: #667eea;
    background: #f0f4ff;
  }
`;

const AttachmentTrigger = styled.button`
  background: none;
  border: none;
  color: #667eea;
  font-size: 14px;
  cursor: pointer;
  padding: 4px 0;
  display: flex;
  align-items: center;
  gap: 8px;
  
  &:hover {
    text-decoration: underline;
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const AttachmentList = styled.div`
  margin-top: 8px;
  max-height: 150px;
  overflow-y: auto;
`;

const AttachmentItem = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  background: #f5f5f5;
  border-radius: 6px;
  margin-bottom: 4px;
  font-size: 13px;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const FileIcon = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
`;

const FileName = styled.span`
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #333;
  font-weight: 500;
`;

const FileSize = styled.span`
  color: #666;
  font-size: 11px;
`;

const ProgressBar = styled.div`
  width: 60px;
  height: 4px;
  background: #e0e0e0;
  border-radius: 2px;
  overflow: hidden;
  
  &::after {
    content: '';
    display: block;
    height: 100%;
    background: #667eea;
    width: ${props => props.progress || 0}%;
    transition: width 0.3s ease;
  }
`;

const ActionButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  font-size: 12px;
  
  &:hover {
    background: #e0e0e0;
  }
  
  &.delete {
    color: #dc3545;
  }
  
  &.download {
    color: #667eea;
  }
`;

const ErrorMessage = styled.div`
  color: #dc3545;
  font-size: 12px;
  margin-top: 4px;
  padding: 4px 8px;
  background: #ffebee;
  border-radius: 4px;
`;

const AttachmentCounter = styled.span`
  color: #666;
  font-size: 12px;
  font-weight: normal;
  margin-left: 8px;
`;

const AttachmentManager = ({ 
  taskId = null, // null for new tasks, taskId for existing tasks
  boardId = null, // needed for optimistic updates
  existingAttachments = [], 
  onAttachmentsChange,
  disabled = false,
  // New callback props for migration from forwardRef
  onPendingFilesChange = null, // sends pending files to parent
  onUploadRequest = null, // parent provides upload handler
  onUploadSuccess = null, // upload success callback
  onUploadError = null // upload error callback
}) => {
  
  // Store methods for optimistic updates
  const updateTaskAttachments = useStore((state) => state.updateTaskAttachments);
  const removeTaskAttachment = useStore((state) => state.removeTaskAttachment);
  
  const [pendingFiles, setPendingFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState({});
  const [errors, setErrors] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const allAttachments = [...(Array.isArray(existingAttachments) ? existingAttachments : []), ...pendingFiles];
  const totalFiles = allAttachments.length;
  
  // Helper to update parent component (prioritizes new callback pattern over legacy)
  const updateParent = (newPendingFiles) => {
    // Use new callback pattern if available
    if (onPendingFilesChange) {
      onPendingFilesChange(newPendingFiles);
    } 
    // Fallback to legacy pattern only for new tasks and if new pattern not available
    else if (onAttachmentsChange && !taskId) {
      onAttachmentsChange(newPendingFiles);
    }
  };

  const handleFileSelect = (files) => {
    console.log('handleFileSelect called with files:', files);
    
    if (!files || files.length === 0) {
      console.log('No files selected');
      return;
    }
    
    const fileArray = Array.from(files);
    console.log('File array:', fileArray);
    console.log('Current allAttachments:', allAttachments);
    const validation = validateFiles(fileArray, allAttachments);
    console.log('Validation result:', validation);
    
    // Clear file input after processing to prevent duplicate submissions
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }
    
    // Clear validation errors when files are successfully added
    setErrors([]);
    
    // For both new and existing tasks, store files for later upload (consistent behavior)
    const newPendingFiles = validation.validFiles.map(file => ({
      id: `temp-${Date.now()}-${Math.random()}`,
      file,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      status: 'ready' // ready for upload when task is saved
    }));
    
    const updatedPendingFiles = [...pendingFiles, ...newPendingFiles];
    setPendingFiles(updatedPendingFiles);
    updateParent(updatedPendingFiles);
  };

  // Method to upload pending files with proper progress tracking and partial failure handling
  const uploadPendingFiles = async (overrideTaskId = null, overrideBoardId = null) => {
    // Use provided parameters for new task flow, fallback to props for existing task flow
    const uploadTaskId = overrideTaskId || taskId;
    const uploadBoardId = overrideBoardId || boardId;
    const pendingFilesToUpload = pendingFiles.filter(pf => pf.status === 'ready');
    
    if (pendingFilesToUpload.length === 0) {
      // No files to upload, just return
      return;
    }

    // Callback pattern: delegate to parent with proper progress tracking
    if (onUploadRequest) {
      try {
        // Mark all files as uploading before starting
        setPendingFiles(prev => 
          prev.map(pf => 
            pf.status === 'ready' 
              ? { ...pf, status: 'uploading' }
              : pf
          )
        );

        const uploadResults = await onUploadRequest(
          pendingFilesToUpload, 
          uploadTaskId, 
          uploadBoardId,
          // Progress callback
          (fileId, progress) => {
            setUploadProgress(prev => ({
              ...prev,
              [fileId]: progress
            }));
          }
        );

        // Handle results based on success/failure
        if (uploadResults && typeof uploadResults === 'object') {
          // Remove successful uploads from pending files and add optimistic updates
          if (uploadResults.successful && uploadResults.successful.length > 0) {
            // Get the successfully uploaded files for optimistic updates
            const successfulFiles = uploadResults.successful.map(s => {
              const originalFile = pendingFilesToUpload.find(pf => pf.id === s.fileId);
              return {
                id: s.result?.id || `uploaded-${Date.now()}-${Math.random()}`, // Use server ID if available
                fileName: originalFile.fileName,
                fileSize: originalFile.fileSize,
                mimeType: originalFile.mimeType,
                downloadURL: s.result?.downloadURL || null,
                storagePath: s.result?.storagePath || null,
                uploadedAt: new Date().toISOString(),
                uploadedBy: 'current-user' // Could be enhanced with actual user ID
              };
            });

            // Optimistically update the store for existing tasks
            if (uploadTaskId && uploadBoardId) {
              successfulFiles.forEach(attachment => {
                updateTaskAttachments(uploadBoardId, uploadTaskId, attachment);
              });
            }

            // Remove successful files from pending
            setPendingFiles(prev => prev.filter(pf => 
              !uploadResults.successful.some(s => s.fileId === pf.id)
            ));
            
            // Clear progress for successful files
            const successfulIds = uploadResults.successful.map(s => s.fileId);
            setUploadProgress(prev => {
              const newProgress = { ...prev };
              successfulIds.forEach(id => delete newProgress[id]);
              return newProgress;
            });
          }

          // Mark failed uploads as errored
          if (uploadResults.failed && uploadResults.failed.length > 0) {
            setPendingFiles(prev => 
              prev.map(pf => {
                const failedUpload = uploadResults.failed.find(f => f.fileId === pf.id);
                return failedUpload 
                  ? { ...pf, status: 'error', error: failedUpload.error }
                  : pf;
              })
            );

            // Clear progress for failed files
            const failedIds = uploadResults.failed.map(f => f.fileId);
            setUploadProgress(prev => {
              const newProgress = { ...prev };
              failedIds.forEach(id => delete newProgress[id]);
              return newProgress;
            });
          }

          // Call success callback if any files succeeded and clear errors
          if (uploadResults.successful && uploadResults.successful.length > 0) {
            // Clear errors for successfully uploaded files
            setErrors(prev => prev.filter(error => 
              !uploadResults.successful.some(s => error.includes(pendingFilesToUpload.find(pf => pf.id === s.fileId)?.fileName))
            ));
            
            if (onUploadSuccess) {
              onUploadSuccess();
            }
          }

          // Call error callback if any files failed and add detailed error messages
          if (uploadResults.failed && uploadResults.failed.length > 0) {
            // Add specific error messages to the local error state
            const newErrors = uploadResults.failed.map(f => `Failed to upload ${f.fileName}: ${f.error}`);
            setErrors(prev => [...prev, ...newErrors]);
            
            if (onUploadError) {
              const combinedError = new Error(uploadResults.failed.map(f => f.error).join('; '));
              onUploadError(combinedError);
            }
          }

          // Only throw if all uploads failed
          if (uploadResults.allFailed) {
            throw new Error(uploadResults.failed.map(f => f.error).join('; '));
          }
        } else {
          // Legacy handling - clear all on success
          setPendingFiles(prev => prev.filter(pf => pf.status !== 'uploading'));
          setUploadProgress({});
          if (onUploadSuccess) {
            onUploadSuccess();
          }
        }
      } catch (error) {
        // Mark all uploading files as errored
        setPendingFiles(prev => 
          prev.map(pf => 
            pf.status === 'uploading' 
              ? { ...pf, status: 'error', error: error.message }
              : pf
          )
        );
        
        // Clear progress for errored files
        setUploadProgress({});
        
        if (onUploadError) {
          onUploadError(error);
        }
        throw error; // Re-throw for backward compatibility
      }
    }
  };

  const handleDelete = async (attachment, isPending = false) => {
    if (isPending) {
      // Remove from pending files
      const newPendingFiles = pendingFiles.filter(pf => pf.id !== attachment.id);
      setPendingFiles(newPendingFiles);
      updateParent(newPendingFiles);
    } else {
      // Delete from server and existing attachments with optimistic update
      
      // Optimistic delete first if boardId available
      if (boardId && taskId) {
        removeTaskAttachment(boardId, taskId, attachment.id);
      }
      
      try {
        if (taskId) {
          await deleteTaskAttachment(taskId, attachment.id);
        }
        
        // Fallback for new tasks - update parent component
        if ((!boardId || !taskId) && onAttachmentsChange) {
          const newAttachments = existingAttachments.filter(att => att.id !== attachment.id);
          onAttachmentsChange(newAttachments);
        }
      } catch (error) {
        // Rollback optimistic delete on error
        if (boardId && taskId) {
          updateTaskAttachments(boardId, taskId, attachment);
        }
        setErrors(prev => [...prev, `Failed to delete ${attachment.fileName}: ${error.message}`]);
      }
    }
  };

  const handleDownload = async (attachment) => {
    try {
      await downloadAttachment(taskId, attachment.id, attachment.fileName);
    } catch (error) {
      setErrors(prev => [...prev, `Failed to download ${attachment.fileName}: ${error.message}`]);
    }
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent event from bubbling to parent (modal)
    setDragOver(true);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent event from bubbling to parent (modal)
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent event from bubbling to parent (modal)
    
    // Only set dragOver to false if we're actually leaving the attachment container
    // This prevents flickering when dragging over child elements
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDragOver(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent event from bubbling to parent (modal)
    setDragOver(false);
    
    if (disabled) return;
    
    const files = e.dataTransfer.files;
    handleFileSelect(files);
  };

  return (
    <AttachmentContainer
      className={dragOver ? 'dragover' : ''}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.txt,.csv"
        onChange={(e) => {
          console.log('File input onChange event:', e.target.files);
          handleFileSelect(e.target.files);
        }}
        style={{ display: 'none' }}
        disabled={disabled}
      />
      
      <AttachmentTrigger 
        type="button"
        onClick={() => {
          if (disabled) return;
          fileInputRef.current?.click();
        }}
        disabled={disabled || totalFiles >= 5}
      >
        📎 {totalFiles >= 5 ? 'Maximum files reached' : 'Add files (max 10MB each)'}
        <AttachmentCounter>({totalFiles}/5)</AttachmentCounter>
      </AttachmentTrigger>
      
      {errors.length > 0 && (
        <ErrorMessage>
          {errors.map((error, index) => (
            <div key={index}>{error}</div>
          ))}
        </ErrorMessage>
      )}
      
      {allAttachments.length > 0 && (
        <AttachmentList>
          {/* Existing attachments - only show if we have a taskId */}
          {taskId && (Array.isArray(existingAttachments) ? existingAttachments : []).filter(att => att && att.id).map(attachment => (
            <AttachmentItem key={attachment.id}>
              <FileIcon>
                {(() => {
                  const IconComponent = getFileIcon(attachment.mimeType || 'application/octet-stream');
                  return <IconComponent size={16} />;
                })()}
              </FileIcon>
              <FileName title={attachment.fileName || 'Unknown file'}>{attachment.fileName || 'Unknown file'}</FileName>
              <FileSize>{formatFileSize(attachment.fileSize || 0)}</FileSize>
              {taskId && (
                <ActionButton 
                  className="download"
                  onClick={() => handleDownload(attachment)}
                  title="Download"
                >
                  ⬇️
                </ActionButton>
              )}
              <ActionButton 
                className="delete"
                onClick={() => handleDelete(attachment, false)}
                title="Delete"
                disabled={disabled}
              >
                ×
              </ActionButton>
            </AttachmentItem>
          ))}
          
          {/* Pending files */}
          {pendingFiles
            .filter(pendingFile => {
              // For new tasks (no taskId), show all pending files
              if (!taskId) return true;
              
              // For existing tasks, show ready files (waiting for save), uploading files (for progress) and error files (for retry)
              return pendingFile.status === 'ready' || pendingFile.status === 'uploading' || pendingFile.status === 'error';
            })
            .map(pendingFile => (
            <AttachmentItem key={pendingFile.id}>
              <FileIcon>
                {(() => {
                  const IconComponent = getFileIcon(pendingFile.mimeType);
                  return <IconComponent size={16} />;
                })()}
              </FileIcon>
              <FileName title={pendingFile.fileName}>{pendingFile.fileName}</FileName>
              <FileSize>{formatFileSize(pendingFile.fileSize)}</FileSize>
              
              {pendingFile.status === 'uploading' && (
                <ProgressBar progress={uploadProgress[pendingFile.id] || 0} />
              )}
              
              {pendingFile.status === 'ready' && (
                <span style={{ color: '#667eea', fontSize: '11px' }}>Ready</span>
              )}
              
              {pendingFile.status === 'error' && (
                <span style={{ color: '#dc3545', fontSize: '11px' }}>Error</span>
              )}
              
              <ActionButton 
                className="delete"
                onClick={() => handleDelete(pendingFile, true)}
                title="Remove"
                disabled={disabled || pendingFile.status === 'uploading'}
              >
                ×
              </ActionButton>
            </AttachmentItem>
          ))}
        </AttachmentList>
      )}
    </AttachmentContainer>
  );
};

AttachmentManager.displayName = 'AttachmentManager';

export default AttachmentManager;