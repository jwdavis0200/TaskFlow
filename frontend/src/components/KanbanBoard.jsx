import React, { useState, useEffect } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import styled from "@emotion/styled";
import { css } from "@emotion/react";
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

const KanbanBoard = () => {
  const {
    boards,
    selectedBoard,
    projects,
    selectedProject,
    loadProjects,
    loadBoards,
    setSelectedBoard,
    updateTask,
  } = useStore();
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
      loadBoards(projects[0]._id);
    } else {
      console.log("KanbanBoard: No projects found");
    }
  }, [projects, loadBoards]);

  useEffect(() => {
    console.log("KanbanBoard: Boards updated:", boards);
    console.log("KanbanBoard: Selected board:", selectedBoard);
    // Auto-select first board if none selected
    if (boards.length > 0 && !selectedBoard) {
      console.log("KanbanBoard: Auto-selecting first board:", boards[0]);
      setSelectedBoard(boards[0]);
    }
  }, [boards, selectedBoard, setSelectedBoard]);

  const [showTaskForm, setShowTaskForm] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null); // For editing existing tasks

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

  if (!selectedBoard || !selectedBoard.columns) {
    return <LoadingContainer>Loading boards...</LoadingContainer>;
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <BoardContainer>
        <Header>
          <Title>TaskFlow Pro - {selectedBoard.name || "Kanban Board"}</Title>
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
