import React from "react";
import { useDrag } from "react-dnd";
import styled from "@emotion/styled";
import Timer from "./Timer";
import { useStore } from "../store";

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

const DueDateTag = styled(MetaTag)`
  background: ${(props) => {
    const dueDate = new Date(props.dueDate);
    const today = new Date();
    const diffDays = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return "#ffebee"; // Overdue - light red
    if (diffDays <= 1) return "#fff3e0"; // Due soon - light orange
    return "#e8f5e8"; // Normal - light green
  }};
  color: ${(props) => {
    const dueDate = new Date(props.dueDate);
    const today = new Date();
    const diffDays = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return "#c62828"; // Overdue - red
    if (diffDays <= 1) return "#ef6c00"; // Due soon - orange
    return "#2e7d32"; // Normal - green
  }};
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

const StatusTag = styled(MetaTag)`
  background: #e3f2fd;
  color: #1565c0;
`;

const TimerContainer = styled.div`
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #eee;
`;

const formatStatus = (status) => {
  switch (status) {
    case "to-do":
      return "To Do";
    case "in-progress":
      return "In Progress";
    case "done":
      return "Done";
    default:
      return status;
  }
};

const TaskCard = ({ task, onEdit, columnId }) => {
  const [{ isDragging }, drag] = useDrag({
    type: "task",
    item: { id: task._id },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const updateTask = useStore((state) => state.updateTask);

  // Handler for time updates from the Timer component
  const handleTimeUpdate = (taskId, newTimeSpent) => {
    updateTask({ ...task, timeSpent: newTimeSpent, isRunning: true });
  };

  // Handler for timer completion from the Timer component
  const handleTimerComplete = (taskId) => {
    updateTask({ ...task, isRunning: false });
  };

  const formatDueDate = (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
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
      </div>

      {task.description && (
        <TaskDescription>{task.description}</TaskDescription>
      )}

      <TaskMeta>
        {task.priority && (
          <PriorityTag priority={task.priority}>{task.priority}</PriorityTag>
        )}
        {task.status && <StatusTag>{formatStatus(task.status)}</StatusTag>}
        {task.dueDate && (
          <DueDateTag dueDate={task.dueDate}>
            Due {formatDueDate(task.dueDate)}
          </DueDateTag>
        )}
      </TaskMeta>

      <TimerContainer>
        <Timer
          taskId={task.id}
          initialTime={task.timeSpent}
          onTimeUpdate={handleTimeUpdate}
          onTimerComplete={handleTimerComplete}
        />
      </TimerContainer>
    </CardContainer>
  );
};

export default TaskCard;
