import React, { useState } from 'react';
import styled from '@emotion/styled';
import { useStore } from '../store';
import BoardsList from './BoardsList';
import Modal from './common/Modal';
import BoardForm from './BoardForm';
import ProjectForm from './ProjectForm';

const ProjectsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const ProjectItem = styled.div`
  background: white;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  transition: all 0.2s ease;

  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    transform: translateY(-1px);
  }
`;

const ProjectHeader = styled.div`
  padding: 16px;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const ProjectName = styled.h3`
  font-weight: 600;
  color: #1e293b;
  margin: 0;
  cursor: pointer;
  transition: color 0.2s ease;
  flex: 1;
  
  &:hover {
    color: #3b82f6;
  }
`;

const ProjectActions = styled.div`
  display: flex;
  gap: 8px;
  opacity: 0;
  transition: opacity 0.2s ease;

  ${ProjectItem}:hover & {
    opacity: 1;
  }
  
  @media (max-width: 768px) {
    opacity: 1;
  }
`;

const ActionButton = styled.button`
  padding: 6px 12px;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
`;

const EditButton = styled(ActionButton)`
  background: #eff6ff;
  color: #1d4ed8;

  &:hover {
    background: #dbeafe;
  }
`;

const DeleteButton = styled(ActionButton)`
  background: #fef2f2;
  color: #dc2626;

  &:hover {
    background: #fee2e2;
  }
`;

const AddBoardButton = styled(ActionButton)`
  background: #f0fdf4;
  color: #16a34a;

  &:hover {
    background: #dcfce7;
  }
`;

const ProjectContent = styled.div`
  padding: 0 16px 16px 16px;
`;

const EmptyState = styled.div`
  color: #64748b;
  font-size: 14px;
  text-align: center;
  padding: 32px 16px;
  background: white;
  border-radius: 12px;
  border: 2px dashed #e2e8f0;
`;

const ProjectListItem = ({ project, onShowBoardModal, onEditProject }) => {
  const {
    setSelectedProject,
    loadBoards,
    deleteProject
  } = useStore();
  
  const handleProjectClick = () => {
    setSelectedProject(project);
    loadBoards(project._id);
  };

  const handleEditProject = (e) => {
    e.stopPropagation();
    onEditProject(project);
  };

  const handleDeleteProject = async (e) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete "${project.name}"? This will also delete all boards and tasks in this project.`)) {
      try {
        await deleteProject(project._id);
      } catch (error) {
        alert('Failed to delete project. Please try again.');
      }
    }
  };

  const handleAddBoard = (e) => {
    e.stopPropagation();
    onShowBoardModal(project._id);
  };
  
  return (
    <ProjectItem>
      <ProjectHeader>
        <ProjectName onClick={handleProjectClick}>
          📋 {project.name}
        </ProjectName>
        <ProjectActions>
          <AddBoardButton onClick={handleAddBoard} title="Add Board">
            + Board
          </AddBoardButton>
          <EditButton onClick={handleEditProject} title="Edit Project">
            ✏️
          </EditButton>
          <DeleteButton onClick={handleDeleteProject} title="Delete Project">
            🗑️
          </DeleteButton>
        </ProjectActions>
      </ProjectHeader>
      <ProjectContent>
        <BoardsList boards={project.boards || []} projectId={project._id} />
      </ProjectContent>
    </ProjectItem>
  );
};

const ProjectsList = ({ projects }) => {
  const [showCreateBoardModal, setShowCreateBoardModal] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [showEditProjectModal, setShowEditProjectModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);

  const handleShowBoardModal = (projectId) => {
    setSelectedProjectId(projectId);
    setShowCreateBoardModal(true);
  };

  const handleCloseBoardModal = () => {
    setShowCreateBoardModal(false);
    setSelectedProjectId(null);
  };

  const handleEditProject = (project) => {
    setSelectedProject(project);
    setShowEditProjectModal(true);
  };

  const handleCloseEditModal = () => {
    setShowEditProjectModal(false);
    setSelectedProject(null);
  };

  if (!projects || projects.length === 0) {
    return (
      <EmptyState>
        No projects available<br />
        <small>Click "New Project" to create your first project</small>
      </EmptyState>
    );
  }

  return (
    <>
      <ProjectsContainer>
        {projects.map((project) => (
          <ProjectListItem 
            key={project._id} 
            project={project} 
            onShowBoardModal={handleShowBoardModal}
            onEditProject={handleEditProject}
          />
        ))}
      </ProjectsContainer>
      
      <Modal 
        isOpen={showCreateBoardModal} 
        onClose={handleCloseBoardModal}
      >
        <BoardForm 
          projectId={selectedProjectId} 
          onClose={handleCloseBoardModal} 
        />
      </Modal>
      
      <Modal 
        isOpen={showEditProjectModal} 
        onClose={handleCloseEditModal}
      >
        <ProjectForm 
          project={selectedProject} 
          onClose={handleCloseEditModal} 
        />
      </Modal>
    </>
  );
};

export default ProjectsList;