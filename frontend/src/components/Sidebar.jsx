import { useState, useEffect } from 'react';
import styled from '@emotion/styled';
import { Assignment, Settings } from '@mui/icons-material';
import { useStore } from '../store';
import ProjectsList from './ProjectsList';
import InvitationsPanel from './InvitationsPanel';
import Modal from './common/Modal';
import ProjectForm from './ProjectForm';
import SettingsPanel from './SettingsPanel';
import { HiMenuAlt2, HiOutlineLogout } from 'react-icons/hi';

const SidebarContainer = styled.div`
  position: relative;
  top: 0;
  left: 0;
  width: ${props => props.isOpen ? '320px' : '0'};
  background: var(--sidebar-bg);
  border-right: ${props => props.isOpen ? '1px solid var(--color-border)' : 'none'};
  padding: ${props => props.isOpen ? '20px' : '0'};
  height: 100vh;
  overflow: hidden;
  box-shadow: ${props => props.isOpen ? '2px 0 10px rgba(0, 0, 0, 0.05)' : 'none'};
  z-index: 999;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  
  @media (hover: none) and (pointer: coarse), (max-width: 768px) {
    position: fixed;
    width: 320px;
    transform: translateX(${props => props.isOpen ? '0' : '-100%'});
    padding-bottom: 64px;
    border-right: 1px solid var(--color-border);
    box-shadow: 2px 0 10px rgba(0, 0, 0, 0.05);
  }
  
  /* Scrollbar styling */
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
  }

  &::-webkit-scrollbar-thumb:hover {
    background: color-mix(in srgb, var(--scrollbar-thumb) 80%, var(--color-text-secondary));
  }
`;

const ToggleButton = styled.button`
  position: fixed;
  top: 20px;
  left: ${props => props.isOpen ? '272px' : '20px'};
  width: 40px;
  height: 40px;
  background: transparent;
  color: var(--sidebar-text);
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
    background: color-mix(in oklab, currentColor 10%, transparent);
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
  color: var(--sidebar-text);
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
    background: color-mix(in oklab, currentColor 10%, transparent);
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
  border-bottom: 1px solid var(--color-border);
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
  color: var(--sidebar-text);
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const SidebarContent = styled.div`
  flex: 1;
  overflow-y: auto;
`;;;;;;

const TitleIcon = styled.span`
  font-size: 24px;
`;

const SettingsButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  margin-left: 6px;
  border: none;
  background: transparent;
  color: var(--sidebar-text);
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s ease, transform 0.1s ease;

  &:hover {
    background: color-mix(in oklab, currentColor 10%, transparent);
  }

  &:active {
    transform: translateY(1px);
  }
`;

const AddButton = styled.button`
  width: 100%;
  padding: 12px 16px;
  background: linear-gradient(135deg, var(--brand-gradient-start) 0%, var(--brand-gradient-end) 100%);
  color: #fff;
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
    background: linear-gradient(135deg, var(--brand-gradient-end) 0%, var(--brand-gradient-start) 100%);
    transform: translateY(-1px);
    box-shadow: 0 4px 8px color-mix(in oklab, var(--color-primary) 40%, transparent);
  }

  &:active {
    transform: translateY(0);
  }
`;

const Sidebar = () => {
  const { projects, isSidebarOpen, toggleSidebar, signOut, loading } = useStore();

  
  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const handleCreateProject = () => {
    setShowCreateProjectModal(true);
  };

  const handleCloseProjectModal = () => {
    setShowCreateProjectModal(false);
  };

  const handleOpenSettings = () => {
    setShowSettingsModal(true);
  };

  const handleCloseSettings = () => {
    setShowSettingsModal(false);
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
              <TitleIcon><Assignment /></TitleIcon>
              Projects
              <SettingsButton aria-label="Open settings" title="Settings" onClick={handleOpenSettings}>
                <Settings fontSize="small" />
              </SettingsButton>
            </SidebarTitle>
          </SidebarHeaderTop>
          <AddButton onClick={handleCreateProject}>
            <span>+</span>
            New Project
          </AddButton>
        </SidebarHeader>
        <SidebarContent>
          <InvitationsPanel />
          <ProjectsList projects={projects} loading={loading} />
        </SidebarContent>
      </SidebarContainer>
      
      <Modal 
        isOpen={showCreateProjectModal} 
        onClose={handleCloseProjectModal}
      >
        <ProjectForm onClose={handleCloseProjectModal} />
      </Modal>

      <Modal 
        isOpen={showSettingsModal}
        onClose={handleCloseSettings}
      >
        <SettingsPanel onClose={handleCloseSettings} />
      </Modal>
    </>
  );
};

export default Sidebar;