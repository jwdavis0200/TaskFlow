import React, { useState, useEffect } from 'react';
import styled from '@emotion/styled';
import { Rocket } from '@mui/icons-material';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase/config';
import { useStore } from '../store';

const Banner = styled.div`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 15px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  position: relative;
  z-index: 9999;
`;

const BannerContent = styled.div`
  flex: 1;
`;

const BannerTitle = styled.div`
  font-weight: 600;
  font-size: 16px;
  margin-bottom: 4px;
`;

const BannerMessage = styled.div`
  font-size: 14px;
  opacity: 0.9;
`;

const BannerActions = styled.div`
  display: flex;
  gap: 10px;
  align-items: center;
`;

const Button = styled.button`
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 14px;
  
  ${props => props.variant === 'primary' && `
    background: white;
    color: #667eea;
    &:hover {
      background: #f0f3ff;
    }
  `}
  
  ${props => props.variant === 'secondary' && `
    background: rgba(255, 255, 255, 0.2);
    color: white;
    border: 1px solid rgba(255, 255, 255, 0.3);
    &:hover {
      background: rgba(255, 255, 255, 0.3);
    }
  `}
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  font-size: 18px;
  padding: 4px;
  opacity: 0.7;
  transition: opacity 0.2s;
  
  &:hover {
    opacity: 1;
  }
`;

const MigrationBanner = ({ onOpenMigration }) => {
  const [showBanner, setShowBanner] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState(null);
  const [isChecking, setIsChecking] = useState(true);
  const isAuthenticated = useStore(state => state.isAuthenticated);

  useEffect(() => {
    if (isAuthenticated) {
      checkMigrationNeeded();
    }
  }, [isAuthenticated]);

  const checkMigrationNeeded = async () => {
    try {
      setIsChecking(true);
      const checkNeeded = httpsCallable(functions, 'checkMigrationNeeded');
      const result = await checkNeeded();
      
      setMigrationStatus(result.data);
      
      // Show banner if migration is needed and user hasn't dismissed it
      const dismissed = localStorage.getItem('migration-banner-dismissed');
      if (result.data.needsMigration && !dismissed) {
        setShowBanner(true);
      }
      
    } catch (error) {
      console.error('Failed to check migration status:', error);
    } finally {
      setIsChecking(false);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem('migration-banner-dismissed', 'true');
  };

  const handleOpenMigration = () => {
    setShowBanner(false);
    if (onOpenMigration) {
      onOpenMigration();
    }
  };

  // Don't show banner if not authenticated, still checking, or no migration needed
  if (!isAuthenticated || isChecking || !showBanner || !migrationStatus?.needsMigration) {
    return null;
  }

  return (
    <Banner>
      <BannerContent>
        <BannerTitle style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Rocket />
          Enable Team Collaboration
        </BannerTitle>
        <BannerMessage>
          {migrationStatus.projectsToMigrate} of your projects need a quick update to enable invitations and team collaboration features.
        </BannerMessage>
      </BannerContent>
      
      <BannerActions>
        <Button 
          variant="primary" 
          onClick={handleOpenMigration}
        >
          Upgrade Now
        </Button>
        <Button 
          variant="secondary" 
          onClick={handleDismiss}
        >
          Later
        </Button>
        <CloseButton onClick={handleDismiss}>
          ×
        </CloseButton>
      </BannerActions>
    </Banner>
  );
};

export default MigrationBanner;