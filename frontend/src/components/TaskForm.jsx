import { useState, useEffect, useRef } from "react";
import { useStore } from "../store";
import { formatDateForInput, createDateFromInput } from "../utils/dateUtils";
import {
  FormContainer,
  FormHeader,
  FormTitle,
  FormBody,
  FormContent,
  FormGroup,
  Label,
  Input,
  TextArea,
  Select,
  FormActions,
  PrimaryButton,
  SecondaryButton,
} from "./common/FormComponents";
import LoadingSpinner from "./common/LoadingSpinner";
import AttachmentManager from "./AttachmentManager";
import { uploadTaskAttachment } from "../services/storage";


const TaskForm = ({ task, onClose }) => {
  const addTask = useStore((state) => state.addTask);
  const updateTask = useStore((state) => state.updateTask);
  const selectedBoard = useStore((state) => state.selectedBoard);
  const projects = useStore((state) => state.projects);

  const [pendingFiles, setPendingFiles] = useState([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState("medium");
  const [columnId, setColumnId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attachmentErrors, setAttachmentErrors] = useState([]);

  // Clear attachment errors when starting new operations
  const clearAttachmentErrors = () => setAttachmentErrors([]);
  
  // Handle file uploads callback with progress tracking and proper error handling
  const handleUploadRequest = async (pendingFilesToUpload, taskId) => {
    const uploadErrors = [];
    const successfulUploads = [];
    
    for (const pendingFile of pendingFilesToUpload) {
      try {
        const result = await uploadTaskAttachment(taskId, pendingFile.file, (progress) => {
        });
        
        successfulUploads.push({ fileId: pendingFile.id, result });
        console.log("TaskForm: Successfully uploaded:", pendingFile.fileName);
      } catch (uploadError) {
        console.error("TaskForm: Failed to upload:", pendingFile.fileName, uploadError);
        const errorMessage = `Failed to upload ${pendingFile.fileName}: ${uploadError.message}`;
        uploadErrors.push({ fileId: pendingFile.id, fileName: pendingFile.fileName, error: errorMessage });
      }
    }
    
    return {
      successful: successfulUploads,
      failed: uploadErrors,
      allFailed: uploadErrors.length === pendingFilesToUpload.length
    };
  };

  useEffect(() => {
    if (task) {
      setTitle(task.title || "");
      setDescription(task.description || "");
      setDueDate(formatDateForInput(task.dueDate));
      setPriority(task.priority || "medium");
      setColumnId(task.columnId || "");
    }
  }, [task]);

  useEffect(() => {
    // Set default column to first available column only when no task is being edited
    if (
      !task &&
      selectedBoard &&
      selectedBoard.columns &&
      selectedBoard.columns.length > 0
    ) {
      setColumnId(selectedBoard.columns[0]._id);
    }
  }, [selectedBoard?.columns, task]);


  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedBoard || !projects.length) {
      alert("No board or project selected");
      return;
    }

    setIsSubmitting(true);
    clearAttachmentErrors(); // Clear any previous attachment errors

    try {
      const taskData = {
        title: title.trim(),
        description: description.trim(),
        dueDate: createDateFromInput(dueDate),
        priority,
        timeSpent: task ? task.timeSpent : 0,
        isRunning: task ? task.isRunning : false,
        isCompleted: task ? task.isCompleted : false,
      };

      const projectId = projects[0]._id;
      const boardId = selectedBoard._id;
      const targetColumnId = columnId || selectedBoard.columns[0]._id;

      if (task) {
        const newColumnId = columnId || task.columnId;
        console.log("TaskForm: Updating task", {
          taskId: task._id,
          oldColumnId: task.columnId,
          newColumnId,
          taskData,
        });
        // Update existing task - pass all required parameters
        await updateTask(projectId, boardId, task.columnId, task._id, { 
          ...taskData, 
          columnId: newColumnId 
        });
        
        // Upload pending attachments if any exist
        if (pendingFiles.length > 0) {
          try {
            const uploadResults = await handleUploadRequest(
              pendingFiles, 
              task._id
            );
            
            if (uploadResults.failed.length > 0 && uploadResults.allFailed) {
              // All uploads failed
              const errorMessages = uploadResults.failed.map(f => f.error);
              setAttachmentErrors(errorMessages);
              setIsSubmitting(false);
            } else if (uploadResults.failed.length > 0) {
              // Partial failures - show errors but don't stop
              const errorMessages = uploadResults.failed.map(f => f.error);
              setAttachmentErrors(errorMessages);
              setPendingFiles(prev => prev.filter(pf => 
                !uploadResults.successful.some(s => s.fileId === pf.id)
              ));
              onClose(); // Close modal, some uploads succeeded
            } else {
              // All uploads successful
              setPendingFiles([]);
              onClose();
            }
          } catch (uploadError) {
            console.error("TaskForm: Unexpected upload error:", uploadError);
            setAttachmentErrors([`Failed to upload attachments: ${uploadError.message}`]);
            setIsSubmitting(false);
          }
        } else {
          onClose(); // No attachments, close immediately
        }
      } else {
        // Create new task
        const createdTask = await addTask(projectId, boardId, targetColumnId, taskData);
        
        // Upload pending attachments if any exist
        if (pendingFiles.length > 0) {
          try {
            const uploadResults = await handleUploadRequest(
              pendingFiles, 
              createdTask._id
            );
            
            if (uploadResults.failed.length > 0 && uploadResults.allFailed) {
              // All uploads failed
              const errorMessages = uploadResults.failed.map(f => f.error);
              setAttachmentErrors(errorMessages);
              setIsSubmitting(false);
            } else if (uploadResults.failed.length > 0) {
              // Partial failures - show errors but don't stop
              const errorMessages = uploadResults.failed.map(f => f.error);
              setAttachmentErrors(errorMessages);
              setPendingFiles(prev => prev.filter(pf => 
                !uploadResults.successful.some(s => s.fileId === pf.id)
              ));
              onClose(); // Close modal, some uploads succeeded
            } else {
              // All uploads successful
              setPendingFiles([]);
              onClose();
            }
          } catch (uploadError) {
            console.error("TaskForm: Unexpected upload error:", uploadError);
            setAttachmentErrors([`Failed to upload attachments: ${uploadError.message}`]);
            setIsSubmitting(false);
          }
        } else {
          onClose(); // No attachments, close immediately
        }
      }
    } catch (error) {
      console.error("Error saving task:", error);
      alert("Failed to save task. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <FormContainer>
      <FormHeader>
        <FormTitle>{task ? "Edit Task" : "Create Task"}</FormTitle>
      </FormHeader>

      <FormBody onSubmit={handleSubmit}>
        <FormContent>
          <FormGroup>
          <Label htmlFor="title">Title *</Label>
          <Input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter task title"
            required
          />
        </FormGroup>

        <FormGroup>
          <Label htmlFor="description">Description</Label>
          <TextArea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter task description (optional)"
          />
        </FormGroup>

        {selectedBoard && selectedBoard.columns && (
          <FormGroup>
            <Label htmlFor="column">Workflow Stage</Label>
            <Select
              id="column"
              value={columnId}
              onChange={(e) => setColumnId(e.target.value)}
              required
            >
              <option value="">Select Stage</option>
              {selectedBoard.columns.map((column) => (
                <option key={column._id} value={column._id}>
                  {column.name.split('-').map(word => 
                    word.charAt(0).toUpperCase() + word.slice(1)
                  ).join(' ')}
                </option>
              ))}
            </Select>
          </FormGroup>
        )}

        <FormGroup>
          <Label htmlFor="priority">Priority</Label>
          <Select
            id="priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </Select>
        </FormGroup>


        <FormGroup>
          <Label htmlFor="dueDate">Due Date</Label>
          <Input
            type="date"
            id="dueDate"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </FormGroup>

        <FormGroup>
          <Label htmlFor="attachments">Attachments</Label>
          <AttachmentManager
            taskId={task?._id}
            boardId={selectedBoard?._id}
            existingAttachments={task?.attachments || []}
            disabled={isSubmitting}
            onPendingFilesChange={setPendingFiles}
          />
          {attachmentErrors.length > 0 && (
            <div style={{ 
              color: '#d32f2f', 
              fontSize: '14px', 
              marginTop: '8px',
              padding: '8px',
              backgroundColor: '#ffebee',
              border: '1px solid #ffcdd2',
              borderRadius: '4px'
            }}>
              {attachmentErrors.map((error, index) => (
                <div key={index}>{error}</div>
              ))}
            </div>
          )}
        </FormGroup>
        </FormContent>

        <FormActions>
          <SecondaryButton type="button" onClick={onClose}>
            Cancel
          </SecondaryButton>
          <PrimaryButton type="submit" disabled={isSubmitting}>
            {isSubmitting && <LoadingSpinner />}
            {isSubmitting ? "Saving..." : task ? "Update Task" : "Add Task"}
          </PrimaryButton>
        </FormActions>
      </FormBody>
    </FormContainer>
  );
};

export default TaskForm;
