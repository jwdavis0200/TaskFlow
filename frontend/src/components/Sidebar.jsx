import React, { useState, useEffect } from 'react';
import styled from '@emotion/styled';
import { useStore } from '../store';
import ProjectsList from './ProjectsList';
import InvitationsPanel from './InvitationsPanel';
import Modal from './common/Modal';
import ProjectForm from './ProjectForm';
import { HiMenuAlt2, HiOutlineLogout } from 'react-icons/hi';

const SidebarContainer = styled.div`
  position: relative;
  top: 0;
  left: 0;
  width: ${props => props.isOpen ? '320px' : '0'};
  background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
  border-right: ${props => props.isOpen ? '1px solid #e2e8f0' : 'none'};
  padding: ${props => props.isOpen ? '20px' : '0'};
  height: 100vh;
  overflow: hidden;
  box-shadow: ${props => props.isOpen ? '2px 0 10px rgba(0, 0, 0, 0.05)' : 'none'};
  z-index: 999;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  
  @media (max-width: 768px) {
    position: fixed;
    width: 320px;
    transform: translateX(${props => props.isOpen ? '0' : '-100%'});
    padding: 20px;
    border-right: 1px solid #e2e8f0;
    box-shadow: 2px 0 10px rgba(0, 0, 0, 0.05);
  }
  
  /* Scrollbar styling */
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

const ToggleButton = styled.button`
  position: fixed;
  top: 20px;
  left: ${props => props.isOpen ? '272px' : '20px'};
  width: 40px;
  height: 40px;
  background: transparent;
  color: #333;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  box-shadow: none;
  transition: all 0.3s ease;
  z-index: 1001;
  
  &:hover {
    background: rgba(0, 0, 0, 0.1);
    transform: translateY(-1px);
  }
  
  &:focus {
    outline: none;
  }
  
  &:active {
    transform: translateY(0);
  }
  
  @media (min-width: 769px) {
    left: ${props => props.isOpen ? '272px' : '20px'};
  }
`;

const FloatingLogoutButton = styled.button`
  position: fixed;
  top: 20px;
  left: ${props => props.isOpen ? '220px' : '-50px'};
  width: 40px;
  height: 40px;
  background: transparent;
  color: #374151;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  box-shadow: none;
  transition: all 0.3s ease;
  z-index: 1001;
  opacity: ${props => props.isOpen ? 1 : 0};
  visibility: ${props => props.isOpen ? 'visible' : 'hidden'};
  
  &:hover {
    background: rgba(0, 0, 0, 0.1);
    transform: translateY(-1px);
  }
  
  &:active {
    transform: translateY(0);
  }
  
  @media (min-width: 769px) {
    left: ${props => props.isOpen ? '220px' : '-50px'};
  }
`;

const SidebarHeader = styled.div`
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e2e8f0;
  position: relative;
`;

const SidebarHeaderTop = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
`;

const SidebarTitle = styled.h2`
  font-size: 20px;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const SidebarContent = styled.div`
  flex: 1;
  overflow-y: auto;
`;

const SidebarFooter = styled.div`
  padding-top: 16px;
  border-top: 1px solid #e2e8f0;
  margin-top: auto;
`;

const LogoutButton = styled.button`
  width: 100%;
  padding: 12px 16px;
  background: #ef4444;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;

  &:hover {
    background: #dc2626;
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }
`;



const TitleIcon = styled.span`
  font-size: 24px;
`;

const AddButton = styled.button`
  width: 100%;
  padding: 12px 16px;
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);

  &:hover {
    background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(59, 130, 246, 0.4);
  }

  &:active {
    transform: translateY(0);
  }
`;

const Sidebar = () => {
  const { projects, addProject, isSidebarOpen, toggleSidebar, user, signOut } = useStore();
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  
  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false);

  const handleCreateProject = () => {
    setShowCreateProjectModal(true);
  };

  const handleCloseProjectModal = () => {
    setShowCreateProjectModal(false);
  };

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && isSidebarOpen) {
        toggleSidebar();
      }
      // Toggle sidebar with Ctrl/Cmd + B
      if ((event.ctrlKey || event.metaKey) && event.key === 'b') {
        event.preventDefault();
        toggleSidebar();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isSidebarOpen, toggleSidebar]);
  
  return (
    <>
      <FloatingLogoutButton
        isOpen={isSidebarOpen}
        onClick={handleLogout}
        aria-label="Sign out"
        title="Sign out"
      >
        <HiOutlineLogout size={20} />
      </FloatingLogoutButton>
      <ToggleButton
        isOpen={isSidebarOpen}
        onClick={toggleSidebar}
        aria-label={isSidebarOpen ? "Hide sidebar" : "Show sidebar"}
        aria-expanded={isSidebarOpen}
      >
        <HiMenuAlt2 size={20} />
      </ToggleButton>
      
      <SidebarContainer
        isOpen={isSidebarOpen}
        role="navigation"
        aria-label="Project navigation sidebar"
        aria-hidden={!isSidebarOpen}
      >
        <SidebarHeader>
          <SidebarHeaderTop>
            <SidebarTitle>
              <TitleIcon>📋</TitleIcon>
              Projects
            </SidebarTitle>
          </SidebarHeaderTop>
          <AddButton onClick={handleCreateProject}>
            <span>+</span>
            New Project
          </AddButton>
        </SidebarHeader>
        <SidebarContent>
          <InvitationsPanel />
          <ProjectsList projects={projects} />
        </SidebarContent>
      </SidebarContainer>
      
      <Modal 
        isOpen={showCreateProjectModal} 
        onClose={handleCloseProjectModal}
      >
        <ProjectForm onClose={handleCloseProjectModal} />
      </Modal>
    </>
  );
};

export default Sidebar;