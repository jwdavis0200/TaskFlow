import { useDrop } from "react-dnd";
import styled from "@emotion/styled";
import { Note } from '@mui/icons-material';
import TaskCard from "./TaskCard";
import { useStore } from "../store";

const ColumnContainer = styled.div`
  background: var(--color-surface-elevated-1);
  border-radius: 12px;
  padding: 16px;
  min-height: 400px;
  max-height: calc(100vh - 120px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
  border: 1px solid var(--color-border);
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  word-wrap: break-word;
  overflow-wrap: break-word;
  
  @media (hover: none) and (pointer: coarse), (max-width: 768px) {
    max-width: calc(100vw - 40px);
    width: 100%;
    box-sizing: border-box;
  }

  ${(props) =>
    props.isOver &&
    `
    border-color: var(--color-success-text);
    background: color-mix(in oklab, var(--color-success-bg) 50%, transparent);
    transform: scale(1.02);
    box-shadow: 0 8px 25px color-mix(in oklab, var(--color-success-text) 20%, transparent);
  `}

  &:hover {
    box-shadow: 0 6px 25px rgba(0, 0, 0, 0.25);
  }
`;

const ColumnHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 2px solid var(--color-border);
`;

const ColumnTitle = styled.h3`
  margin: 0;
  color: var(--color-text-primary);
  font-size: 18px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  word-wrap: break-word;
  word-break: break-word;
  overflow-wrap: break-word;
  hyphens: auto;
  max-width: 100%;
  
  @media (hover: none) and (pointer: coarse), (max-width: 768px) {
    font-size: 16px;
    line-height: 1.2;
  }
`;

const TaskCount = styled.span`
  background: var(--brand-gradient-end);
  color: #fff;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  min-width: 20px;
  text-align: center;
`;

const TasksContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1;
  overflow-y: auto;
  padding-right: 4px;
  min-height: 0;
  
  /* Custom scrollbar styling */
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: var(--scrollbar-track);
    border-radius: 3px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: var(--scrollbar-thumb);
    border-radius: 3px;
    
    &:hover {
      background: var(--scrollbar-thumb);
    }
  }
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: var(--color-text-secondary);
  font-style: italic;
  text-align: center;
  border: 2px dashed var(--color-border);
  border-radius: 8px;
  margin-top: 20px;

  &::before {
    font-size: 32px;
    margin-bottom: 8px;
  }
  
  svg {
    font-size: 32px;
    margin-bottom: 8px;
    color: var(--color-text-secondary);
  }
`;

const Column = ({ column, onEdit, projectId, boardId }) => {
  const moveTask = useStore((state) => state.moveTask);
  const canEditTasks = useStore((state) => state.canEditTasks);

  const [{ isOver }, drop] = useDrop({
    accept: "task",
    drop: (item) => {
      if (canEditTasks(projectId)) {
        moveTask(item.id, column._id, projectId, boardId);
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  });

  return (
    <ColumnContainer ref={drop} isOver={isOver}>
      <ColumnHeader>
        <ColumnTitle>
          {column.name.split('-').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
          ).join(' ')}
        </ColumnTitle>
        <TaskCount>{column.tasks?.length || 0}</TaskCount>
      </ColumnHeader>
      <TasksContainer>
        {column.tasks && column.tasks.length > 0 ? (
          column.tasks.map((task) => (
            <TaskCard
              key={task._id}
              task={task}
              onEdit={onEdit}
              columnId={column._id}
              projectId={projectId}
              boardId={boardId}
            />
          ))
        ) : (
          <EmptyState>
            <Note style={{ fontSize: 32, marginBottom: 8, color: '#666' }} />
            Drop tasks here or create a new one
          </EmptyState>
        )}
      </TasksContainer>
    </ColumnContainer>
  );
};

export default Column;
