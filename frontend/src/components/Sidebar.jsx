import React, { useState } from 'react';
import styled from '@emotion/styled';
import { useStore } from '../store';
import ProjectsList from './ProjectsList';

const SidebarContainer = styled.div`
  width: 280px;
  background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
  border-right: 1px solid #e2e8f0;
  padding: 20px;
  height: 100vh;
  overflow-y: auto;
  box-shadow: 2px 0 10px rgba(0, 0, 0, 0.05);
  
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

const SidebarHeader = styled.div`
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e2e8f0;
`;

const SidebarTitle = styled.h2`
  font-size: 20px;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 16px 0;
  display: flex;
  align-items: center;
  gap: 8px;
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
  const { projects, addProject } = useStore();
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  
  const handleCreateProject = async () => {
    const projectName = prompt('Enter project name:');
    if (projectName && projectName.trim()) {
      try {
        await addProject({
          name: projectName.trim(),
          description: `Project: ${projectName.trim()}`
        });
      } catch (error) {
        alert('Failed to create project. Please try again.');
      }
    }
  };
  
  return (
    <SidebarContainer>
      <SidebarHeader>
        <SidebarTitle>
          <TitleIcon>📋</TitleIcon>
          Projects
        </SidebarTitle>
        <AddButton onClick={handleCreateProject}>
          <span>+</span>
          New Project
        </AddButton>
      </SidebarHeader>
      <ProjectsList projects={projects} />
    </SidebarContainer>
  );
};

export default Sidebar;