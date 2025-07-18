import React, { useState, useEffect } from "react";
import styled from "@emotion/styled";
import { useStore } from "../store";
import { formatDateForInput, createDateFromInput } from "../utils/dateUtils";

const FormContainer = styled.div`
  background: white;
  border-radius: 16px;
  overflow: hidden;
`;

const FormHeader = styled.div`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 16px 20px;
  text-align: center;
`;

const FormTitle = styled.h2`
  margin: 0;
  font-size: 24px;
  font-weight: 600;
`;

const FormBody = styled.form`
  padding: 20px;
`;

const FormGroup = styled.div`
  margin-bottom: 16px;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 8px;
  color: #333;
  font-weight: 500;
  font-size: 14px;
`;

const Input = styled.input`
  width: 100%;
  padding: 12px 16px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
  transition: all 0.3s ease;
  box-sizing: border-box;

  &:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  }

  &:hover {
    border-color: #ccc;
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  padding: 12px 16px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
  min-height: 80px;
  resize: vertical;
  font-family: inherit;
  transition: all 0.3s ease;
  box-sizing: border-box;

  &:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  }

  &:hover {
    border-color: #ccc;
  }
`;

const Select = styled.select`
  width: 100%;
  padding: 12px 16px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
  background: white;
  transition: all 0.3s ease;
  box-sizing: border-box;

  &:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  }

  &:hover {
    border-color: #ccc;
  }
`;

const FormActions = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  padding-top: 16px;
  border-top: 1px solid #eee;
`;

const Button = styled.button`
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  min-width: 100px;

  &:hover {
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }
`;

const PrimaryButton = styled(Button)`
  background: linear-gradient(45deg, #667eea, #764ba2);
  color: white;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);

  &:hover {
    box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
  }
`;

const SecondaryButton = styled(Button)`
  background: #f5f5f5;
  color: #666;
  border: 1px solid #ddd;

  &:hover {
    background: #eeeeee;
    border-color: #ccc;
  }
`;

const TaskForm = ({ task, onClose }) => {
  const addTask = useStore((state) => state.addTask);
  const updateTask = useStore((state) => state.updateTask);
  const selectedBoard = useStore((state) => state.selectedBoard);
  const projects = useStore((state) => state.projects);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [status, setStatus] = useState("To Do");
  const [priority, setPriority] = useState("Medium");
  const [columnId, setColumnId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (task) {
      setTitle(task.title || "");
      setDescription(task.description || "");
      setDueDate(formatDateForInput(task.dueDate));
      setStatus(task.status || "To Do");
      setPriority(task.priority || "Medium");
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
        status,
        priority,
        timeSpent: task ? task.timeSpent : 0,
        isRunning: task ? task.isRunning : false,
        isCompleted: task ? task.isCompleted : false,
      };

      const projectId = projects[0]._id;
      const boardId = selectedBoard._id;
      const targetColumnId = columnId || selectedBoard.columns[0]._id;

      if (task) {
        const newColumn = selectedBoard.columns.find(
          (c) => c.name.toLowerCase() === status.toLowerCase().replace("-", " ")
        );
        const newColumnId = newColumn ? newColumn._id : task.columnId;
        console.log("TaskForm: Updating task", {
          taskId: task._id,
          oldColumnId: task.columnId,
          newColumnId,
          status,
          taskData,
        });
        // Update existing task
        await updateTask(projectId, boardId, newColumnId, task._id, taskData);
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

        {!task && selectedBoard && selectedBoard.columns && (
          <FormGroup>
            <Label htmlFor="column">Column</Label>
            <Select
              id="column"
              value={columnId}
              onChange={(e) => setColumnId(e.target.value)}
            >
              {selectedBoard.columns.map((column) => (
                <option key={column._id} value={column._id}>
                  {column.name}
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
          <Label htmlFor="status">Status</Label>
          <Select
            id="status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="to-do">To Do</option>
            <option value="in-progress">In Progress</option>
            <option value="done">Done</option>
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
            {isSubmitting ? "Saving..." : task ? "Update Task" : "Add Task"}
          </PrimaryButton>
        </FormActions>
      </FormBody>
    </FormContainer>
  );
};

export default TaskForm;
