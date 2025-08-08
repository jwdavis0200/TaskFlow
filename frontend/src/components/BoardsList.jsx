import styled from '@emotion/styled';
import { BarChart, Edit, Delete } from '@mui/icons-material';
import { useStore } from '../store';

const BoardsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 12px;
`;

const BoardItem = styled.div`
  padding: 12px;
  border-radius: 8px;
  background: var(--color-surface-elevated-2);
  border: 1px solid var(--color-border);
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 14px;
  color: var(--color-text-primary);
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;
  
  &:hover {
    background: color-mix(in oklab, var(--color-primary) 12%, var(--color-surface-elevated-2));
    color: var(--color-primary);
    transform: translateX(4px);
    box-shadow: 0 2px 8px color-mix(in oklab, var(--color-primary) 30%, transparent);
  }
`;

const BoardName = styled.span`
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
`;

const BoardActions = styled.div`
  display: flex;
  gap: 6px;
  opacity: 0;
  transition: opacity 0.2s ease;

  ${BoardItem}:hover & {
    opacity: 1;
  }
`;

const ActionButton = styled.button`
  padding: 4px 8px;
  border: none;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
`;

const EditButton = styled(ActionButton)`
  background: color-mix(in oklab, var(--color-primary) 15%, transparent);
  color: var(--color-primary);

  &:hover {
    background: color-mix(in oklab, var(--color-primary) 25%, transparent);
  }
`;

const DeleteButton = styled(ActionButton)`
  background: color-mix(in oklab, var(--color-danger-text) 15%, transparent);
  color: var(--color-danger-text);

  &:hover {
    background: color-mix(in oklab, var(--color-danger-text) 25%, transparent);
  }
`;

const EmptyState = styled.div`
  font-size: 12px;
  color: var(--color-text-secondary);
  text-align: center;
  padding: 16px;
  background: var(--color-surface);
  border: 1px dashed var(--color-border);
  border-radius: 8px;
  margin-top: 8px;
`;

const BoardItemComponent = ({ board, projectId }) => {
  const {
    setSelectedBoard,
    updateBoard,
    deleteBoard,
    loadBoards,
    projects,
    setSelectedProject
  } = useStore();
  
  const handleBoardSelect = () => {
    // Find and set the correct project for this board
    const project = projects.find(p => p._id === projectId);
    if (project) {
      console.log("BoardsList: Setting project and board:", project.name, board.name);
      setSelectedProject(project);
      setSelectedBoard(board);
    } else {
      console.warn("BoardsList: Project not found for board:", projectId);
      setSelectedBoard(board);
    }
  };

  const handleEditBoard = async (e) => {
    e.stopPropagation();
    const newName = prompt('Enter new board name:', board.name);
    if (newName && newName.trim() && newName !== board.name) {
      try {
        await updateBoard(projectId, board._id, {
          ...board,
          name: newName.trim()
        });
        // Reload boards to reflect changes
        loadBoards(projectId);
      } catch {
        alert('Failed to update board. Please try again.');
      }
    }
  };

  const handleDeleteBoard = async (e) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete "${board.name}"? This will also delete all columns and tasks in this board.`)) {
      try {
        await deleteBoard(projectId, board._id);
        // State is automatically updated by deleteBoard in store
      } catch {
        alert('Failed to delete board. Please try again.');
      }
    }
  };
  
  return (
    <BoardItem onClick={handleBoardSelect}>
      <BoardName>
        <BarChart style={{ marginRight: '8px' }} />
        {board.name}
      </BoardName>
      <BoardActions>
        <EditButton onClick={handleEditBoard} title="Edit Board">
          <Edit fontSize="small" />
        </EditButton>
        <DeleteButton onClick={handleDeleteBoard} title="Delete Board">
          <Delete fontSize="small" />
        </DeleteButton>
      </BoardActions>
    </BoardItem>
  );
};

const BoardsList = ({ boards, projectId }) => {
  if (!boards || boards.length === 0) {
    return (
      <EmptyState>
        No boards available<br />
        <small>Click "+ Board" to create your first board</small>
      </EmptyState>
    );
  }

  return (
    <BoardsContainer>
      {boards.map((board) => (
        <BoardItemComponent key={board._id} board={board} projectId={projectId} />
      ))}
    </BoardsContainer>
  );
};

export default BoardsList;