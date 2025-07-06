import React, { useState, useEffect } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import styled from "@emotion/styled";
import Column from "./Column";
import TaskForm from "./TaskForm";
import { useStore } from "../store";

// Styled Components
const BoardContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
  box-sizing: border-box;
  flex: 1;
  overflow: hidden;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  padding: 16px 24px;
  border: 1px solid rgba(255, 255, 255, 0.2);
`;

const Title = styled.h1`
  color: white;
  margin: 0;
  font-size: 24px;
  font-weight: 600;
`;

const AddTaskButton = styled.button`
  background: linear-gradient(45deg, #4caf50, #45a049);
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(76, 175, 80, 0.3);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(76, 175, 80, 0.4);
    background: linear-gradient(45deg, #45a049, #4caf50);
  }

  &:active {
    transform: translateY(0);
  }

  @media (max-width: 768px) {
    padding: 10px 16px;
    font-size: 12px;
  }
`;

const ColumnsContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
  flex: 1;
  overflow-x: auto;
  padding: 10px 0;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 16px;
  }
`;

const Modal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  backdrop-filter: blur(5px);
`;

const ModalContent = styled.div`
  background: white;
  border-radius: 16px;
  padding: 0;
  max-width: 480px;
  width: 90%;
  max-height: 85vh;
  overflow-y: auto;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
  animation: modalSlideIn 0.3s ease-out;
  margin: 2vh auto;
  position: relative;

  @keyframes modalSlideIn {
    from {
      opacity: 0;
      transform: translateY(-20px) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  @media (max-width: 768px) {
    max-height: 92vh;
    margin: 1vh auto;
    width: 95%;
    max-width: none;
  }

  /* Ensure scrolling works properly */
  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb {
    background: #c1c1c1;
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: #a8a8a8;
  }
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-size: 18px;
  font-weight: 500;
`;

const EmptyStateContainer = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  text-align: center;
  padding: 20px;
`;

const EmptyStateTitle = styled.h2`
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 12px;
  opacity: 0.9;
`;

const EmptyStateMessage = styled.p`
  font-size: 16px;
  opacity: 0.7;
  max-width: 400px;
  line-height: 1.5;
`;

const KanbanBoard = () => {
  const {
    boards,
    selectedBoard,
    projects,
    selectedProject,
    loadProjects,
    loadBoards,
    setSelectedBoard,
    setSelectedProject,
  } = useStore();
  
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null); // For editing existing tasks
  const [isLoadingBoards, setIsLoadingBoards] = useState(false);
  const [hasLoadedBoards, setHasLoadedBoards] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      console.log("KanbanBoard: Starting to load data...");
      try {
        await loadProjects();
      } catch (error) {
        console.error("KanbanBoard: Error loading projects:", error);
      }
    };
    loadData();
  }, [loadProjects]);

  useEffect(() => {
    console.log("KanbanBoard: Projects updated:", projects);
    if (projects.length > 0) {
      console.log("KanbanBoard: Loading boards for project:", projects[0]._id);
      // Set the first project as selected if no project is currently selected
      if (!selectedProject) {
        setSelectedProject(projects[0]);
      }
      setIsLoadingBoards(true);
      setHasLoadedBoards(false);
      loadBoards(projects[0]._id).finally(() => {
        setIsLoadingBoards(false);
        setHasLoadedBoards(true);
      });
    } else {
      console.log("KanbanBoard: No projects found");
      setHasLoadedBoards(true);
    }
  }, [projects, loadBoards, selectedProject, setSelectedProject]);

  useEffect(() => {
    console.log("KanbanBoard: Syncing selected board. Current boards count:", boards.length);

    if (boards.length > 0) {
      // Check if the currently selected board exists in the updated boards list
      const currentBoardInList = selectedBoard ? boards.find(b => b._id === selectedBoard._id) : null;

      if (currentBoardInList) {
        // If the selected board is in the list, ensure we are using the most up-to-date object.
        // This is crucial for when the board details (like columns) are fetched.
        // A deep equality check avoids unnecessary re-renders.
        if (JSON.stringify(currentBoardInList) !== JSON.stringify(selectedBoard)) {
          console.log("KanbanBoard: Refreshing selected board data.");
          setSelectedBoard(currentBoardInList);
        }
      } else {
        // If there is no selected board, or the old one is gone, select the first board from the new list.
        console.log("KanbanBoard: Auto-selecting first board from the list:", boards[0]);
        setSelectedBoard(boards[0]);
      }
    } else {
      // If there are no boards for this project, clear the selected board.
      console.log("KanbanBoard: No boards available, clearing selection.");
      setSelectedBoard(null);
    }
  }, [boards, selectedBoard, setSelectedBoard]);

  const handleEditTask = (task) => {
    handleOpenTaskForm(task);
  };

  const handleOpenTaskForm = (task = null) => {
    setSelectedTask(task);
    setShowTaskForm(true);
  };

  const handleCloseTaskForm = () => {
    setShowTaskForm(false);
    setSelectedTask(null);
  };

  // Show loading state while actually loading
  if (isLoadingBoards || !hasLoadedBoards) {
    return <LoadingContainer>Loading boards...</LoadingContainer>;
  }

  // Show empty state if no boards exist for the project
  if (hasLoadedBoards && boards.length === 0) {
    return (
      <EmptyStateContainer>
        <EmptyStateTitle>No Boards Found</EmptyStateTitle>
        <EmptyStateMessage>
          This project doesn't have any boards yet. Create a new board to get started with organizing your tasks.
        </EmptyStateMessage>
      </EmptyStateContainer>
    );
  }

  // Show loading if boards exist but none selected yet or columns not loaded
  if (!selectedBoard || !Array.isArray(selectedBoard.columns)) {
    return <LoadingContainer>Loading boards...</LoadingContainer>;
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <BoardContainer>
        <Header>
          <Title>{selectedProject?.name || "Project"} - {selectedBoard.name || "Kanban Board"}</Title>
          <AddTaskButton onClick={() => handleOpenTaskForm()}>
            + Add New Task
          </AddTaskButton>
        </Header>
        <ColumnsContainer>
          {selectedBoard.columns.map((column) => (
            <Column
              key={column._id}
              column={column}
              onEdit={handleEditTask}
              projectId={selectedProject?._id || projects[0]?._id}
              boardId={selectedBoard._id}
            />
          ))}
        </ColumnsContainer>
        {showTaskForm && (
          <Modal
            onClick={(e) =>
              e.target === e.currentTarget && handleCloseTaskForm()
            }
          >
            <ModalContent>
              <TaskForm task={selectedTask} onClose={handleCloseTaskForm} />
            </ModalContent>
          </Modal>
        )}
      </BoardContainer>
    </DndProvider>
  );
};

export default KanbanBoard;
