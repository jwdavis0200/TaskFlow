import React, { useState, useEffect } from "react";
import { useStore } from "../store";
import { formatDateForInput, createDateFromInput } from "../utils/dateUtils";
import {
  FormContainer,
  FormHeader,
  FormTitle,
  FormBody,
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


const TaskForm = ({ task, onClose }) => {
  const addTask = useStore((state) => state.addTask);
  const updateTask = useStore((state) => state.updateTask);
  const selectedBoard = useStore((state) => state.selectedBoard);
  const projects = useStore((state) => state.projects);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState("medium");
  const [columnId, setColumnId] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (task) {
      setTitle(task.title || "");
      setDescription(task.description || "");
      setDueDate(formatDateForInput(task.dueDate));
      setPriority(task.priority || "medium");
      setColumnId(task.columnId || "");
      setAttachments(Array.isArray(task.attachments) ? task.attachments : []);
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

    if (!title.trim()) {
      alert("Please enter a task title");
      return;
    }

    if (!selectedBoard || !projects.length) {
      alert("No board or project selected");
      return;
    }

    setIsSubmitting(true);

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
        // Update existing task - pass current columnId as 3rd param, new columnId in taskData
        await updateTask(projectId, boardId, task.columnId, task._id, { 
          ...taskData, 
          columnId: newColumnId 
        });
      } else {
        // Create new task
        const createdTask = await addTask(projectId, boardId, targetColumnId, taskData);
        
        // Upload any pending files after task creation
        const pendingFiles = attachments.filter(att => att.file && att.status === 'ready');
        if (pendingFiles.length > 0) {
          console.log("TaskForm: Uploading pending files for new task:", createdTask._id, pendingFiles);
          // Import uploadTaskAttachment to handle pending files
          const { uploadTaskAttachment } = await import('../services/storage');
          
          for (const pendingFile of pendingFiles) {
            try {
              await uploadTaskAttachment(createdTask._id, pendingFile.file);
              console.log("TaskForm: Successfully uploaded:", pendingFile.fileName);
            } catch (uploadError) {
              console.error("TaskForm: Failed to upload:", pendingFile.fileName, uploadError);
              // Continue with other files even if one fails
            }
          }
        }
      }

      onClose();
    } catch (error) {
      console.error("Error saving task:", error);
      alert("Failed to save task. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <FormContainer>
      <FormHeader>
        <FormTitle>{task ? "Edit Task" : "Create Task"}</FormTitle>
      </FormHeader>

      <FormBody onSubmit={handleSubmit}>
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
            taskId={task?._id || null}
            existingAttachments={attachments}
            onAttachmentsChange={setAttachments}
            disabled={isSubmitting}
          />
        </FormGroup>

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
