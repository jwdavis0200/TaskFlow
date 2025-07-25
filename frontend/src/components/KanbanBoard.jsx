import React, { useState, useEffect } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import styled from "@emotion/styled";
import Column from "./Column";
import TaskForm from "./TaskForm";
import Modal from "./common/Modal";
import { useStore } from "../store";

// Styled Components
const BoardContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
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
    canEditTasks,
    isDragInProgress,
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
      // Set the first project as selected if no project is currently selected
      if (!selectedProject) {
        console.log("KanbanBoard: Setting first project as selected:", projects[0]._id);
        setSelectedProject(projects[0]);
      }
    } else {
      console.log("KanbanBoard: No projects found");
      setHasLoadedBoards(true);
    }
  }, [projects, selectedProject, setSelectedProject]);

  // Separate useEffect for loading boards when selectedProject changes
  useEffect(() => {
    if (selectedProject) {
      // Validate project has required properties
      if (!selectedProject._id || !selectedProject.name) {
        console.error("KanbanBoard: Invalid selectedProject:", selectedProject);
        setHasLoadedBoards(true);
        return;
      }
      
      console.log("KanbanBoard: Loading boards for selected project:", selectedProject._id);
      setIsLoadingBoards(true);
      setHasLoadedBoards(false);
      loadBoards(selectedProject._id)
        .catch((error) => {
          console.error("KanbanBoard: Failed to load boards:", error);
        })
        .finally(() => {
          setIsLoadingBoards(false);
          setHasLoadedBoards(true);
        });
    } else {
      console.log("KanbanBoard: No selected project, clearing boards");
      setHasLoadedBoards(true);
    }
  }, [selectedProject, loadBoards]);

  useEffect(() => {
    // Skip board synchronization during drag operations to prevent state conflicts
    if (isDragInProgress) {
      console.log("KanbanBoard: Skipping board sync during drag operation");
      return;
    }
    
    console.log("KanbanBoard: Syncing selected board. Current boards count:", boards.length);

    if (boards.length > 0) {
      // Check if the currently selected board exists in the updated boards list
      const currentBoardInList = selectedBoard ? boards.find(b => b._id === selectedBoard._id) : null;

      if (currentBoardInList) {
        // If the selected board is in the list, ensure we are using the most up-to-date object.
        // This is crucial for when the board details (like columns) are fetched.
        // Efficient comparison of key properties instead of deep JSON comparison.
        const needsUpdate = 
          currentBoardInList.name !== selectedBoard.name ||
          currentBoardInList.columns?.length !== selectedBoard.columns?.length ||
          currentBoardInList.updatedAt !== selectedBoard.updatedAt;
        
        if (needsUpdate) {
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
  }, [boards, selectedBoard, setSelectedBoard, isDragInProgress]);

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
          {canEditTasks(selectedProject?._id) && (
            <AddTaskButton onClick={() => handleOpenTaskForm()}>
              + Add New Task
            </AddTaskButton>
          )}
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
        <Modal 
          isOpen={showTaskForm} 
          onClose={handleCloseTaskForm}
        >
          <TaskForm task={selectedTask} onClose={handleCloseTaskForm} />
        </Modal>
      </BoardContainer>
    </DndProvider>
  );
};

export default KanbanBoard;
