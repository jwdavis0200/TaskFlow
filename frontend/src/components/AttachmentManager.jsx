import React, { useState, useRef, useEffect } from 'react';
import styled from '@emotion/styled';
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
  font-size: 16px;
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
  existingAttachments = [], 
  onAttachmentsChange,
  disabled = false 
}) => {
  
  const [pendingFiles, setPendingFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState({});
  const [errors, setErrors] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const allAttachments = [...(Array.isArray(existingAttachments) ? existingAttachments : []), ...pendingFiles];
  const totalFiles = allAttachments.length;
  
  // Helper to update parent component
  const updateParent = (newPendingFiles) => {
    if (onAttachmentsChange) {
      if (taskId) {
        // For existing tasks, send combined attachments
        const newAllAttachments = [...(Array.isArray(existingAttachments) ? existingAttachments : []), ...newPendingFiles];
        onAttachmentsChange(newAllAttachments);
      } else {
        // For new tasks, only send pending files (don't duplicate)
        onAttachmentsChange(newPendingFiles);
      }
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
    
    setErrors([]);
    
    if (taskId) {
      // For existing tasks, upload immediately
      uploadFiles(validation.validFiles);
    } else {
      // For new tasks, just store files for later upload
      const newPendingFiles = validation.validFiles.map(file => ({
        id: `temp-${Date.now()}-${Math.random()}`,
        file,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        status: 'ready' // ready for upload when task is created
      }));
      
      setPendingFiles(prev => {
        const updatedPendingFiles = [...prev, ...newPendingFiles];
        updateParent(updatedPendingFiles);
        return updatedPendingFiles;
      });
    }
  };

  const uploadFiles = async (files) => {
    for (const file of files) {
      const tempId = `temp-${Date.now()}-${Math.random()}`;
      
      // Add to pending files with uploading status
      const pendingFile = {
        id: tempId,
        file,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        status: 'uploading'
      };
      
      setPendingFiles(prev => [...prev, pendingFile]);
      
      try {
        const result = await uploadTaskAttachment(
          taskId,
          file,
          (progress) => {
            setUploadProgress(prev => ({
              ...prev,
              [tempId]: progress
            }));
          }
        );
        
        // Remove from pending and add to existing attachments
        setPendingFiles(prev => prev.filter(pf => pf.id !== tempId));
        setUploadProgress(prev => {
          const { [tempId]: removed, ...rest } = prev;
          return rest;
        });
        
        const newAttachments = [...existingAttachments, result.attachment];
        if (onAttachmentsChange) {
          onAttachmentsChange(newAttachments);
        }
        
      } catch (error) {
        // Mark as error
        setPendingFiles(prev => 
          prev.map(pf => 
            pf.id === tempId 
              ? { ...pf, status: 'error', error: error.message }
              : pf
          )
        );
        setErrors(prev => [...prev, `Failed to upload ${file.name}: ${error.message}`]);
      }
    }
  };

  const handleDelete = async (attachment, isPending = false) => {
    if (isPending) {
      // Remove from pending files
      setPendingFiles(prev => {
        const newPendingFiles = prev.filter(pf => pf.id !== attachment.id);
        updateParent(newPendingFiles);
        return newPendingFiles;
      });
    } else {
      // Delete from server and existing attachments
      try {
        if (taskId) {
          await deleteTaskAttachment(taskId, attachment.id);
        }
        
        const newAttachments = existingAttachments.filter(att => att.id !== attachment.id);
        if (onAttachmentsChange) {
          onAttachmentsChange(newAttachments);
        }
      } catch (error) {
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

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    
    if (disabled) return;
    
    const files = e.dataTransfer.files;
    handleFileSelect(files);
  };

  return (
    <AttachmentContainer
      className={dragOver ? 'dragover' : ''}
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
              <FileIcon>{getFileIcon(attachment.mimeType || 'application/octet-stream')}</FileIcon>
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
          {pendingFiles.map(pendingFile => (
            <AttachmentItem key={pendingFile.id}>
              <FileIcon>{getFileIcon(pendingFile.mimeType)}</FileIcon>
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

export default AttachmentManager;