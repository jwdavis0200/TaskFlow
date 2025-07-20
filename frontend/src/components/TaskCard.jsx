import React from "react";
import { useDrag } from "react-dnd";
import styled from "@emotion/styled";
import Timer from "./Timer";
import { useStore } from "../store";
import { formatDateForDisplay } from "../utils/dateUtils";

const CardContainer = styled.div`
  background: white;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border: 1px solid #e0e0e0;
  cursor: grab;
  transition: all 0.3s ease;
  opacity: ${(props) => (props.isDragging ? 0.5 : 1)};
  transform: ${(props) =>
    props.isDragging ? "rotate(5deg) scale(1.05)" : "none"};

  &:hover {
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15);
    transform: translateY(-2px);
  }

  &:active {
    cursor: grabbing;
  }
`;

const TaskTitle = styled.h4`
  margin: 0 0 8px 0;
  color: #333;
  font-size: 16px;
  font-weight: 600;
  line-height: 1.3;
`;

const TaskDescription = styled.p`
  margin: 0 0 12px 0;
  color: #666;
  font-size: 14px;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const TaskMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
`;

const MetaTag = styled.span`
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

// Helper function to safely convert various date formats to Date object
const convertToDate = (dateValue) => {
  if (dateValue instanceof Date) {
    return dateValue;
  } else if (dateValue?.toDate && typeof dateValue.toDate === 'function') {
    return dateValue.toDate();
  } else {
    return new Date(dateValue);
  }
};

// Helper function to calculate days difference from today
const calculateDaysDifference = (date) => {
  if (isNaN(date.getTime())) return null;
  const today = new Date();
  return Math.ceil((date - today) / (1000 * 60 * 60 * 24));
};

// Helper function to get due date colors based on days difference
const getDueDateColors = (dueDate) => {
  const date = convertToDate(dueDate);
  const diffDays = calculateDaysDifference(date);
  
  if (diffDays === null) {
    return {
      background: "#f5f5f5", // Invalid date - gray
      color: "#666"
    };
  }
  
  if (diffDays < 0) {
    return {
      background: "#ffebee", // Overdue - light red
      color: "#c62828"       // Overdue - red
    };
  }
  
  if (diffDays <= 1) {
    return {
      background: "#fff3e0", // Due soon - light orange
      color: "#ef6c00"       // Due soon - orange
    };
  }
  
  return {
    background: "#e8f5e8", // Normal - light green
    color: "#2e7d32"       // Normal - green
  };
};

const DueDateTag = styled(MetaTag)`
  background: ${(props) => getDueDateColors(props.dueDate).background};
  color: ${(props) => getDueDateColors(props.dueDate).color};
`;

const PriorityTag = styled(MetaTag)`
  background: ${(props) => {
    switch (props.priority?.toLowerCase()) {
      case "high":
        return "#ffebee";
      case "medium":
        return "#fff3e0";
      case "low":
        return "#e8f5e8";
      default:
        return "#f5f5f5";
    }
  }};
  color: ${(props) => {
    switch (props.priority?.toLowerCase()) {
      case "high":
        return "#c62828";
      case "medium":
        return "#ef6c00";
      case "low":
        return "#2e7d32";
      default:
        return "#666";
    }
  }};
`;


const TimerContainer = styled.div`
  margin-top: 8px;
`;


const TaskCard = ({ task, onEdit, columnId, projectId, boardId }) => {
  // Add this console.log to inspect the task object
  console.log('Inspecting task in TaskCard:', task);

  const [{ isDragging }, drag] = useDrag({
    type: "task",
    item: { id: task._id },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const updateTask = useStore((state) => state.updateTask);
  const deleteTask = useStore((state) => state.deleteTask);

  // Handler for time updates from the Timer component
  const handleTimeUpdate = (taskId, newTimeSpent) => {
    updateTask(projectId, boardId, columnId, taskId, {
      columnId: columnId,
      timeSpent: newTimeSpent,
      isRunning: true
    });
  };

  // Handler for timer completion from the Timer component
  const handleTimerComplete = (taskId, finalTime) => {
    updateTask(projectId, boardId, columnId, taskId, {
      columnId: columnId,
      isRunning: false,
      timeSpent: finalTime // Use final time from timer (authoritative)
    });
  };

  // Handler for deleting the task
  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      try {
        await deleteTask(projectId, boardId, columnId, task._id);
      } catch (error) {
        console.error('Error deleting task:', error);
        alert('Failed to delete task. Please try again.');
      }
    }
  };


  return (
    <CardContainer ref={drag} isDragging={isDragging}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <TaskTitle>{task.title}</TaskTitle>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={() => onEdit({ ...task, columnId })}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: "14px",
              color: "#667eea",
            }}
          >
            Edit
          </button>
          <button
            onClick={handleDelete}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: "14px",
              color: "#dc3545",
            }}
          >
            Delete
          </button>
        </div>
      </div>

      {task.description && (
        <TaskDescription>{task.description}</TaskDescription>
      )}

      <TaskMeta>
        {task.priority && (
          <PriorityTag priority={task.priority}>{task.priority}</PriorityTag>
        )}
        {formatDateForDisplay(task.dueDate) && (
          <DueDateTag dueDate={task.dueDate}>
            Due {formatDateForDisplay(task.dueDate)}
          </DueDateTag>
        )}
      </TaskMeta>

      <TimerContainer>
        <Timer
          taskId={task._id}
          initialTime={task.timeSpent}
          onTimeUpdate={handleTimeUpdate}
          onTimerComplete={handleTimerComplete}
        />
      </TimerContainer>
    </CardContainer>
  );
};

export default TaskCard;
