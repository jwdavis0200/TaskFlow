import { useState } from 'react';
import styled from '@emotion/styled';
import { Assignment, Edit, Delete } from '@mui/icons-material';
import { FaUsers } from 'react-icons/fa';
import { useStore } from '../store';
import BoardsList from './BoardsList';
import Modal from './common/Modal';
import ConfirmationModal from './common/ConfirmationModal';
import BoardForm from './BoardForm';
import ProjectForm from './ProjectForm';
import LoadingSpinner from './common/LoadingSpinner';

const ProjectsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const ProjectItem = styled.div`
  background: var(--color-surface-elevated-1);
  border-radius: 12px;
  border: 1px solid var(--color-border);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  overflow: hidden;
  transition: all 0.2s ease;

  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
    transform: translateY(-1px);
  }
`;

const ProjectHeader = styled.div`
  padding: 16px;
  background: var(--color-surface-elevated-2);
  border-bottom: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
  overflow: hidden;
`;

const ProjectName = styled.h3`
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0;
  cursor: pointer;
  transition: color 0.2s ease;
  font-size: 16px;
  word-wrap: break-word;
  word-break: break-word;
  overflow-wrap: break-word;
  hyphens: auto;
  
  &:hover {
    color: var(--color-primary);
  }
`;

const ProjectInfo = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
`;

const ProjectMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
  font-size: 0.85rem;
  color: var(--color-text-secondary);
`;

const ProjectActions = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: flex-start;
`;

const ActionButton = styled.button`
  padding: 6px 12px;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
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

const AddBoardButton = styled(ActionButton)`
  background: color-mix(in oklab, var(--color-success-text) 15%, transparent);
  color: var(--color-success-text);

  &:hover {
    background: color-mix(in oklab, var(--color-success-text) 25%, transparent);
  }
`;

const ProjectContent = styled.div`
  padding: 0 16px 16px 16px;
`;

const EmptyState = styled.div`
  color: var(--color-text-secondary);
  font-size: 14px;
  text-align: center;
  padding: 32px 16px;
  background: var(--color-surface);
  border-radius: 12px;
  border: 2px dashed var(--color-border);
`;

const LoadingState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
  background: var(--color-surface);
  border-radius: 12px;
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  font-size: 14px;
  gap: 12px;
`;

const ProjectListItem = ({ project, onShowBoardModal, onEditProject, onDeleteProject }) => {
  const {
    setSelectedProject,
    loadBoards,
    canManageBoards,
    canEditProject,
    isProjectOwner
  } = useStore();
  
  const handleProjectClick = () => {
    setSelectedProject(project);
    loadBoards(project._id);
  };

  const handleEditProject = (e) => {
    e.stopPropagation();
    onEditProject(project);
  };

  const handleDeleteProject = (e) => {
    e.stopPropagation();
    onDeleteProject(project);
  };

  const handleAddBoard = (e) => {
    e.stopPropagation();
    onShowBoardModal(project._id);
  };
  
  return (
    <ProjectItem>
      <ProjectHeader>
        <ProjectInfo>
          <ProjectName onClick={handleProjectClick}>
            <Assignment style={{ marginRight: '8px' }} />
            {project.name}
          </ProjectName>
          <ProjectMeta>
            <FaUsers size={12} />
            {project.members?.length || 1} member{(project.members?.length || 1) !== 1 ? 's' : ''}
          </ProjectMeta>
        </ProjectInfo>
        <ProjectActions>
          {canManageBoards(project._id) && (
            <AddBoardButton onClick={handleAddBoard} title="Add Board">
              + Board
            </AddBoardButton>
          )}
          {canEditProject(project._id) && (
            <EditButton onClick={handleEditProject} title="Edit Project">
              <Edit fontSize="small" />
            </EditButton>
          )}
          {isProjectOwner(project._id) && (
            <DeleteButton onClick={handleDeleteProject} title="Delete Project">
              <Delete fontSize="small" />
            </DeleteButton>
          )}
        </ProjectActions>
      </ProjectHeader>
      <ProjectContent>
        <BoardsList boards={project.boards || []} projectId={project._id} />
      </ProjectContent>
    </ProjectItem>
  );
};

const ProjectsList = ({ projects, loading }) => {
  const deleteProject = useStore((state) => state.deleteProject);
  
  const [showCreateBoardModal, setShowCreateBoardModal] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [showEditProjectModal, setShowEditProjectModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const handleDeleteProject = (project) => {
    setSelectedProject(project);
    setShowDeleteModal(true);
  };

  const handleCloseDeleteModal = () => {
    setShowDeleteModal(false);
    setSelectedProject(null);
  };

  const handleConfirmDelete = async () => {
    if (!selectedProject) return;
    
    setIsDeleting(true);
    try {
      await deleteProject(selectedProject._id);
      handleCloseDeleteModal();
    } catch (error) {
      console.error('Failed to delete project:', error);
      // Keep modal open on error so user can retry
    } finally {
      setIsDeleting(false);
    }
  };

  // Show loading state while fetching projects
  if (loading && (!projects || projects.length === 0)) {
    return (
      <LoadingState>
        <LoadingSpinner />
        Loading projects...
      </LoadingState>
    );
  }

  // Show empty state when not loading and no projects exist
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
            onDeleteProject={handleDeleteProject}
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
      
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={handleCloseDeleteModal}
        onConfirm={handleConfirmDelete}
        title="Delete Project"
        message={`Are you sure you want to delete "${selectedProject?.name}"?`}
        warningText="This will permanently delete all boards and tasks in this project. This action cannot be undone."
        confirmText="Delete Project"
        modalType="danger"
        isLoading={isDeleting}
      />
    </>
  );
};

export default ProjectsList;