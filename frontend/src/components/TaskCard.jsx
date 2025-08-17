import { useState } from "react";
import { useDrag } from "react-dnd";
import styled from "@emotion/styled";
import Timer from "./Timer";
import ConfirmationModal from "./common/ConfirmationModal";
import { useStore } from "../store";
import { formatDateForDisplay } from "../utils/dateUtils";
import { GrAttachment } from "react-icons/gr";

const CardContainer = styled.div`
  background: var(--color-surface-elevated-2);
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
  border: 1px solid var(--color-border);
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
  color: var(--color-text-primary);
  font-size: 16px;
  font-weight: 600;
  line-height: 1.3;
  word-wrap: break-word;
  word-break: break-word;
  overflow-wrap: break-word;
  hyphens: auto;
`;

const TaskDescription = styled.p`
  margin: 0 0 12px 0;
  color: var(--color-text-secondary);
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
      background: "var(--color-surface)",
      color: "var(--color-text-secondary)"
    };
  }
  
  if (diffDays < 0) {
    return {
      background: "var(--color-danger-bg)",
      color: "var(--color-danger-text)"
    };
  }
  
  if (diffDays <= 1) {
    return {
      background: "var(--color-warning-bg)",
      color: "var(--color-warning-text)"
    };
  }
  
  return {
    background: "var(--color-success-bg)",
    color: "var(--color-success-text)"
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
        return "var(--color-danger-bg)";
      case "medium":
        return "var(--color-warning-bg)";
      case "low":
        return "var(--color-success-bg)";
      default:
        return "var(--color-surface)";
    }
  }};
  color: ${(props) => {
    switch (props.priority?.toLowerCase()) {
      case "high":
        return "var(--color-danger-text)";
      case "medium":
        return "var(--color-warning-text)";
      case "low":
        return "var(--color-success-text)";
      default:
        return "var(--color-text-secondary)";
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
    item: () => {
      setDragInProgress(true);
      return { id: task._id };
    },
    canDrag: () => canEditTasks(projectId),
    end: () => {
      setDragInProgress(false);
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  // State for delete confirmation modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const applyTaskTimerUpdate = useStore((state) => state.applyTaskTimerUpdate);
  const deleteTask = useStore((state) => state.deleteTask);
  const canEditTasks = useStore((state) => state.canEditTasks);
  const setDragInProgress = useStore((state) => state.setDragInProgress);

  // Handler for time updates from the Timer component
  const handleTimeUpdate = (taskId, newTimeSpent) => {
    // Only update local UI state; backend persistence is handled by timer API
    applyTaskTimerUpdate(boardId, columnId, taskId, {
      timeSpent: newTimeSpent,
      isRunning: true,
    });
  };

  // Handler for timer completion from the Timer component
  const handleTimerComplete = (taskId, finalTime) => {
    // Local state update to reflect stopped state; backend already updated via API
    applyTaskTimerUpdate(boardId, columnId, taskId, {
      isRunning: false,
      timeSpent: finalTime,
    });
  };

  // Handler for opening delete confirmation modal
  const handleDeleteClick = () => {
    setIsDeleteModalOpen(true);
  };

  // Handler for confirming task deletion
  const handleDeleteConfirm = async () => {
    setIsDeleting(true);
    try {
      await deleteTask(projectId, boardId, columnId, task._id);
      setIsDeleteModalOpen(false);
    } catch (error) {
      console.error('Error deleting task:', error);
      alert('Failed to delete task. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Handler for cancelling delete
  const handleDeleteCancel = () => {
    setIsDeleteModalOpen(false);
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
        {canEditTasks(projectId) && (
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
              onClick={handleDeleteClick}
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
        )}
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
        {task.attachments && task.attachments.length > 0 && (
          <MetaTag style={{ background: 'var(--color-success-bg)', color: 'var(--color-success-text)' }}>
            <GrAttachment/> {task.attachments.length}
          </MetaTag>
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

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Delete Task"
        message={`Are you sure you want to delete "${task.title}"?`}
        warningText="This action cannot be undone. The task and all its data will be permanently removed."
        confirmText="Delete Task"
        cancelText="Cancel"
        modalType="danger"
        isLoading={isDeleting}
      />
    </CardContainer>
  );
};

export default TaskCard;
