import { useState, useRef } from 'react';
import styled from '@emotion/styled';
import { useStore } from '../store';
import { 
  validateFiles, 
  formatFileSize, 
  getFileIcon,
  deleteTaskAttachment,
  downloadAttachment
} from '../services/storage';
import { FaFileUpload } from "react-icons/fa";

// Styled components
const AttachmentContainer = styled.div`
  border: 2px dashed var(--color-border);
  border-radius: 8px;
  padding: 12px;
  transition: all 0.3s ease;
  
  &:hover {
    border-color: var(--color-primary);
    background: var(--color-surface-elevated-2);
  }
  
  &.dragover {
    border-color: var(--color-primary);
    background: var(--color-surface-elevated-1);
  }
`;

const AttachmentTrigger = styled.button`
  background: none;
  border: none;
  color: var(--color-primary);
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
  background: var(--color-surface-elevated-2);
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
  color: var(--color-text-primary);
  font-weight: 500;
`;

const FileSize = styled.span`
  color: var(--color-text-secondary);
  font-size: 11px;
`;

const ProgressBar = styled.div`
  width: 60px;
  height: 4px;
  background: var(--color-border);
  border-radius: 2px;
  overflow: hidden;
  
  &::after {
    content: '';
    display: block;
    height: 100%;
    background: var(--color-primary);
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
    background: var(--color-surface-elevated-1);
  }
  
  &.delete {
    color: var(--color-danger-text);
  }
  
  &.download {
    color: var(--color-primary);
  }
`;

const ErrorMessage = styled.div`
  color: var(--color-danger-text);
  font-size: 12px;
  margin-top: 4px;
  padding: 4px 8px;
  background: var(--color-danger-bg);
  border-radius: 4px;
`;

const AttachmentCounter = styled.span`
  color: var(--color-text-secondary);
  font-size: 12px;
  font-weight: normal;
  margin-left: 8px;
`;

const AttachmentManager = ({ 
  taskId = null, // null for new tasks, taskId for existing tasks
  boardId = null, // needed for optimistic updates
  existingAttachments = [], 
  disabled = false,
  onPendingFilesChange = null, // sends pending files to parent
}) => {
  
  // Store methods for optimistic updates
  const updateTaskAttachments = useStore((state) => state.updateTaskAttachments);
  const removeTaskAttachment = useStore((state) => state.removeTaskAttachment);
  
  const [pendingFiles, setPendingFiles] = useState([]);
  const [uploadProgress] = useState({});
  const [errors, setErrors] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const allAttachments = [...(Array.isArray(existingAttachments) ? existingAttachments : []), ...pendingFiles];
  const totalFiles = allAttachments.length;
  
  // Helper to update parent component with pending files
  const updateParent = (newPendingFiles) => {
    if (onPendingFilesChange) {
      onPendingFilesChange(newPendingFiles);
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
        
        // Note: For new tasks without IDs, deletion is only optimistic via store updates
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
        disabled={disabled || totalFiles >= 50}
      >
        <FaFileUpload/>
        {totalFiles >= 50 ? 'Maximum files reached' : 'Add files (max 10MB each)'}
        <AttachmentCounter>({totalFiles}/50)</AttachmentCounter>
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
                <span style={{ color: 'var(--color-primary)', fontSize: '11px' }}>Ready</span>
              )}
              
              {pendingFile.status === 'error' && (
                <span style={{ color: 'var(--color-danger-text)', fontSize: '11px' }}>Error</span>
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