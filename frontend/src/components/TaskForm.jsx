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
  LoadingSpinner
} from "./common/FormComponents";


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
  const [isSubmitting, setIsSubmitting] = useState(false);

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
        await addTask(projectId, boardId, targetColumnId, taskData);
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
