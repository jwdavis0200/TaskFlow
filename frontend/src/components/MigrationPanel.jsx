import React, { useState, useEffect } from 'react';
import styled from '@emotion/styled';
import { Warning, Celebration, CheckCircle } from '@mui/icons-material';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase/config';

const MigrationContainer = styled.div`
  max-width: 1200px;
  margin: 20px auto;
  padding: 24px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 16px;
  box-shadow: 
    0 25px 50px rgba(0, 0, 0, 0.15),
    0 12px 24px rgba(0, 0, 0, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.6);
  position: relative;
  animation: fadeInUp 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(135deg, 
      rgba(59, 130, 246, 0.02) 0%, 
      rgba(29, 78, 216, 0.01) 100%);
    border-radius: 16px;
    pointer-events: none;
  }
  
  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.3);
  position: relative;
  z-index: 1;
`;

const Title = styled.h1`
  margin: 0;
  color: #1e293b;
  font-size: 28px;
  font-weight: 600;
  position: relative;
  z-index: 1;
`;

const StatusBadge = styled.span`
  padding: 8px 16px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  position: relative;
  z-index: 1;
  background: ${props => {
    switch (props.status) {
      case 'ready': return 'rgba(59, 130, 246, 0.1)';
      case 'running': return 'rgba(251, 146, 60, 0.1)';
      case 'completed': return 'rgba(34, 197, 94, 0.1)';
      case 'error': return 'rgba(239, 68, 68, 0.1)';
      default: return 'rgba(148, 163, 184, 0.1)';
    }
  }};
  color: ${props => {
    switch (props.status) {
      case 'ready': return '#3b82f6';
      case 'running': return '#fb923c';
      case 'completed': return '#22c55e';
      case 'error': return '#ef4444';
      default: return '#94a3b8';
    }
  }};
  border: 1px solid ${props => {
    switch (props.status) {
      case 'ready': return 'rgba(59, 130, 246, 0.2)';
      case 'running': return 'rgba(251, 146, 60, 0.2)';
      case 'completed': return 'rgba(34, 197, 94, 0.2)';
      case 'error': return 'rgba(239, 68, 68, 0.2)';
      default: return 'rgba(148, 163, 184, 0.2)';
    }
  }};
`;

const ActionSection = styled.div`
  display: flex;
  gap: 16px;
  margin-bottom: 32px;
  padding: 24px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  position: relative;
  z-index: 1;
  
  @media (hover: none) and (pointer: coarse), (max-width: 768px) {
    flex-direction: column;
    gap: 12px;
  }
`;

const Button = styled.button`
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
  
  &:hover:not(:disabled) {
    transform: translateY(-2px);
  }
  
  &:active:not(:disabled) {
    transform: translateY(0);
  }
  
  ${props => props.variant === 'primary' && `
    background: linear-gradient(45deg, #3b82f6, #1d4ed8);
    color: white;
    box-shadow: 0 4px 15px rgba(59, 130, 246, 0.3);
    &:hover:not(:disabled) {
      box-shadow: 0 6px 20px rgba(59, 130, 246, 0.4);
      background: linear-gradient(45deg, #1d4ed8, #3b82f6);
    }
  `}
  
  ${props => props.variant === 'secondary' && `
    background: rgba(255, 255, 255, 0.9);
    color: #3b82f6;
    border: 1px solid rgba(59, 130, 246, 0.3);
    backdrop-filter: blur(10px);
    &:hover:not(:disabled) {
      background: rgba(59, 130, 246, 0.05);
      border-color: #3b82f6;
    }
  `}
  
  ${props => props.variant === 'danger' && `
    background: linear-gradient(45deg, #ef4444, #dc2626);
    color: white;
    box-shadow: 0 4px 15px rgba(239, 68, 68, 0.3);
    &:hover:not(:disabled) {
      box-shadow: 0 6px 20px rgba(239, 68, 68, 0.4);
      background: linear-gradient(45deg, #dc2626, #b91c1c);
    }
  `}
`;

const ProgressSection = styled.div`
  margin-bottom: 32px;
  position: relative;
  z-index: 1;
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 10px;
  background: rgba(148, 163, 184, 0.2);
  border-radius: 8px;
  overflow: hidden;
  margin: 12px 0;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
`;

const ProgressFill = styled.div`
  height: 100%;
  background: linear-gradient(90deg, #3b82f6, #1d4ed8);
  transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
  width: ${props => props.percentage}%;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
  position: relative;
  
  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(90deg, 
      rgba(255, 255, 255, 0.2) 0%, 
      transparent 50%, 
      rgba(255, 255, 255, 0.2) 100%);
    animation: shimmer 2s infinite;
  }
  
  @keyframes shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 20px;
  margin-bottom: 32px;
  position: relative;
  z-index: 1;
`;

const StatCard = styled.div`
  padding: 24px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 12px;
  text-align: center;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  }
`;

const StatNumber = styled.div`
  font-size: 36px;
  font-weight: 600;
  color: ${props => props.color || '#1e293b'};
  margin-bottom: 8px;
  line-height: 1;
`;

const StatLabel = styled.div`
  font-size: 14px;
  color: #64748b;
  font-weight: 500;
`;

const ResultsSection = styled.div`
  margin-top: 32px;
  position: relative;
  z-index: 1;
`;

const TabNav = styled.div`
  display: flex;
  border-bottom: 1px solid rgba(255, 255, 255, 0.3);
  margin-bottom: 24px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px 8px 0 0;
  padding: 4px;
`;

const Tab = styled.button`
  padding: 12px 20px;
  border: none;
  background: ${props => props.active ? 'rgba(59, 130, 246, 0.1)' : 'transparent'};
  cursor: pointer;
  font-weight: 500;
  color: ${props => props.active ? '#3b82f6' : '#64748b'};
  border-radius: 6px;
  transition: all 0.3s ease;
  font-size: 14px;
  
  &:hover {
    color: #3b82f6;
    background: rgba(59, 130, 246, 0.05);
  }
`;

const ResultsList = styled.div`
  max-height: 400px;
  overflow-y: auto;
  
  /* Custom scrollbar styling */
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 3px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: rgba(59, 130, 246, 0.3);
    border-radius: 3px;
    
    &:hover {
      background: rgba(59, 130, 246, 0.5);
    }
  }
`;

const ResultItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  margin-bottom: 12px;
  background: ${props => {
    switch (props.type) {
      case 'success': return 'rgba(34, 197, 94, 0.1)';
      case 'error': return 'rgba(239, 68, 68, 0.1)';
      case 'warning': return 'rgba(251, 146, 60, 0.1)';
      default: return 'rgba(255, 255, 255, 0.1)';
    }
  }};
  border-left: 4px solid ${props => {
    switch (props.type) {
      case 'success': return '#22c55e';
      case 'error': return '#ef4444';
      case 'warning': return '#fb923c';
      default: return 'rgba(148, 163, 184, 0.5)';
    }
  }};
  border-radius: 0 8px 8px 0;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateX(4px);
  }
`;

// Overview Content Styled Components
const OverviewContainer = styled.div`
  position: relative;
  z-index: 1;
`;

const OverviewHeading = styled.h3`
  margin: 0 0 20px 0;
  color: #1e293b;
  font-size: 24px;
  font-weight: 600;
  line-height: 1.3;
`;

const OverviewSubheading = styled.h4`
  margin: 24px 0 12px 0;
  color: #334155;
  font-size: 18px;
  font-weight: 600;
  line-height: 1.4;
`;

const OverviewParagraph = styled.p`
  margin: 0 0 16px 0;
  color: #475569;
  font-size: 15px;
  line-height: 1.6;
  
  strong {
    color: #1e293b;
    font-weight: 600;
  }
`;

const OverviewList = styled.ol`
  margin: 0 0 24px 0;
  padding-left: 24px;
  color: #475569;
  font-size: 15px;
  line-height: 1.6;
  
  li {
    margin-bottom: 8px;
    
    strong {
      color: #1e293b;
      font-weight: 600;
    }
  }
`;

const OverviewUList = styled.ul`
  margin: 0 0 24px 0;
  padding-left: 24px;
  color: #475569;
  font-size: 15px;
  line-height: 1.6;
  list-style: none;
  
  li {
    margin-bottom: 8px;
    position: relative;
    padding-left: 8px;
    
    &::before {
      content: '';
      position: absolute;
      left: -16px;
      top: 10px;
      width: 4px;
      height: 4px;
      background: #3b82f6;
      border-radius: 50%;
    }
  }
`;

const ResultInfo = styled.div`
  flex: 1;
`;

const ResultTitle = styled.div`
  font-weight: 600;
  margin-bottom: 5px;
`;

const ResultDetail = styled.div`
  font-size: 14px;
  color: #666;
`;

const ErrorDetails = styled.div`
  margin-top: 10px;
  padding: 10px;
  background: rgba(211, 47, 47, 0.1);
  border-radius: 4px;
  font-family: monospace;
  font-size: 12px;
`;

const MigrationPanel = () => {
  const [migrationState, setMigrationState] = useState({
    status: 'checking', // checking, ready, not-needed, validating, running, completed, error
    progress: 0,
    currentPhase: null,
    results: null,
    error: null
  });
  
  const [activeTab, setActiveTab] = useState('overview');
  const [migrationHistory, setMigrationHistory] = useState([]);
  const [validationResults, setValidationResults] = useState(null);
  const [migrationNeedStatus, setMigrationNeedStatus] = useState(null);

  // Check if migration is needed and load history on component mount
  useEffect(() => {
    checkMigrationNeeded();
    loadMigrationHistory();
  }, []);

  const checkMigrationNeeded = async () => {
    try {
      const checkNeeded = httpsCallable(functions, 'checkMigrationNeeded');
      const result = await checkNeeded();
      setMigrationNeedStatus(result.data);
      
      if (!result.data.needsMigration) {
        setMigrationState(prev => ({ ...prev, status: 'not-needed' }));
      } else {
        setMigrationState(prev => ({ ...prev, status: 'ready' }));
      }
    } catch (error) {
      console.error('Failed to check migration status:', error);
      setMigrationState(prev => ({ ...prev, status: 'error', error: error.message }));
    }
  };

  const loadMigrationHistory = async () => {
    try {
      const getMyMigrationStatus = httpsCallable(functions, 'getMyMigrationStatus');
      const result = await getMyMigrationStatus({});
      setMigrationHistory(result.data.migrations || []);
    } catch (error) {
      console.error('Failed to load migration history:', error);
    }
  };

  const runDryRun = async () => {
    setMigrationState(prev => ({ ...prev, status: 'validating', error: null }));
    
    try {
      const migrateFunction = httpsCallable(functions, 'migrateMyProjectsToRBAC');
      const result = await migrateFunction({ dryRun: true });
      
      setValidationResults(result.data);
      setMigrationState(prev => ({ 
        ...prev, 
        status: 'ready',
        currentPhase: 'validation_complete'
      }));
      setActiveTab('validation');
      
    } catch (error) {
      console.error('Dry run failed:', error);
      setMigrationState(prev => ({ 
        ...prev, 
        status: 'error', 
        error: error.message 
      }));
    }
  };

  const runMigration = async () => {
    if (!validationResults) {
      alert('Please run validation first');
      return;
    }

    if (validationResults.invalidProjects.length > 0) {
      if (!window.confirm(`${validationResults.invalidProjects.length} projects have validation errors. Continue anyway?`)) {
        return;
      }
    }

    setMigrationState(prev => ({ 
      ...prev, 
      status: 'running', 
      progress: 0,
      currentPhase: 'migration_starting',
      error: null
    }));

    try {
      const migrateFunction = httpsCallable(functions, 'migrateMyProjectsToRBAC');
      
      // Start migration
      const result = await migrateFunction({ 
        dryRun: false,
        roleMapping: {} // Could allow custom role assignments
      });

      setMigrationState(prev => ({ 
        ...prev, 
        status: 'completed',
        progress: 100,
        currentPhase: 'completed',
        results: result.data
      }));
      
      setActiveTab('results');
      await loadMigrationHistory(); // Refresh history
      
    } catch (error) {
      console.error('Migration failed:', error);
      setMigrationState(prev => ({ 
        ...prev, 
        status: 'error', 
        error: error.message 
      }));
    }
  };

  const renderValidationResults = () => {
    if (!validationResults) return null;

    return (
      <div>
        <StatsGrid>
          <StatCard>
            <StatNumber color="#388e3c">{validationResults.validProjects.length}</StatNumber>
            <StatLabel>Ready to Migrate</StatLabel>
          </StatCard>
          <StatCard>
            <StatNumber color="#1976d2">{validationResults.alreadyMigrated.length}</StatNumber>
            <StatLabel>Already Migrated</StatLabel>
          </StatCard>
          <StatCard>
            <StatNumber color="#d32f2f">{validationResults.invalidProjects.length}</StatNumber>
            <StatLabel>Validation Errors</StatLabel>
          </StatCard>
          <StatCard>
            <StatNumber color="#f57c00">{validationResults.warnings.length}</StatNumber>
            <StatLabel>Warnings</StatLabel>
          </StatCard>
        </StatsGrid>

        <ResultsList>
          {validationResults.invalidProjects.map((project, index) => (
            <ResultItem key={index} type="error">
              <ResultInfo>
                <ResultTitle>{project.name}</ResultTitle>
                <ResultDetail>Project ID: {project.projectId}</ResultDetail>
                <ErrorDetails>
                  {project.errors.map((error, i) => (
                    <div key={i}>• {error}</div>
                  ))}
                </ErrorDetails>
              </ResultInfo>
            </ResultItem>
          ))}
          
          {validationResults.warnings.map((project, index) => (
            <ResultItem key={index} type="warning">
              <ResultInfo>
                <ResultTitle>{project.name}</ResultTitle>
                <ResultDetail>Project ID: {project.projectId}</ResultDetail>
                <ErrorDetails>
                  {project.warnings.map((warning, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Warning fontSize="small" />
                      {warning}
                    </div>
                  ))}
                </ErrorDetails>
              </ResultInfo>
            </ResultItem>
          ))}
        </ResultsList>
      </div>
    );
  };

  const renderMigrationResults = () => {
    if (!migrationState.results) return null;

    const { successful, failed, verification } = migrationState.results;

    return (
      <div>
        <StatsGrid>
          <StatCard>
            <StatNumber color="#388e3c">{successful.length}</StatNumber>
            <StatLabel>Successfully Migrated</StatLabel>
          </StatCard>
          <StatCard>
            <StatNumber color="#d32f2f">{failed.length}</StatNumber>
            <StatLabel>Failed</StatLabel>
          </StatCard>
          <StatCard>
            <StatNumber color="#1976d2">{verification.verified.length}</StatNumber>
            <StatLabel>Verified</StatLabel>
          </StatCard>
          <StatCard>
            <StatNumber color="#f57c00">{verification.inconsistencies.length}</StatNumber>
            <StatLabel>Inconsistencies</StatLabel>
          </StatCard>
        </StatsGrid>

        <ResultsList>
          {failed.map((project, index) => (
            <ResultItem key={index} type="error">
              <ResultInfo>
                <ResultTitle>{project.name}</ResultTitle>
                <ResultDetail>Failed at: {new Date(project.timestamp).toLocaleString()}</ResultDetail>
                <ErrorDetails>{project.error}</ErrorDetails>
              </ResultInfo>
            </ResultItem>
          ))}
          
          {verification.inconsistencies.map((project, index) => (
            <ResultItem key={index} type="warning">
              <ResultInfo>
                <ResultTitle>{project.name || project.projectId}</ResultTitle>
                <ResultDetail>Verification failed</ResultDetail>
                <ErrorDetails>
                  {project.failedChecks?.map((check, i) => (
                    <div key={i}>• {check}</div>
                  )) || <div>• {project.error}</div>}
                </ErrorDetails>
              </ResultInfo>
            </ResultItem>
          ))}
          
          {successful.slice(0, 10).map((project, index) => (
            <ResultItem key={index} type="success">
              <ResultInfo>
                <ResultTitle>{project.name}</ResultTitle>
                <ResultDetail>
                  Migrated {Object.keys(project.rolesAssigned).length} member roles at {new Date(project.timestamp).toLocaleString()}
                </ResultDetail>
              </ResultInfo>
            </ResultItem>
          ))}
        </ResultsList>
      </div>
    );
  };

  // Show different content based on migration need
  if (migrationState.status === 'checking') {
    return (
      <MigrationContainer>
        <Header>
          <Title>Checking Migration Status...</Title>
        </Header>
      </MigrationContainer>
    );
  }

  if (migrationState.status === 'not-needed') {
    return (
      <MigrationContainer>
        <Header>
          <Title>Migration Status</Title>
          <StatusBadge status="completed">All Set!</StatusBadge>
        </Header>
        
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <Celebration />
            Your projects are already migrated!
          </h2>
          <p>All your {migrationNeedStatus?.totalProjects || 0} projects have been successfully migrated to use Role-Based Access Control.</p>
          
          {migrationHistory.length > 0 && (
            <div style={{ marginTop: '30px' }}>
              <h3>Migration History</h3>
              <ResultsList>
                {migrationHistory.map((migration, index) => (
                  <ResultItem key={index} type="success">
                    <ResultInfo>
                      <ResultTitle>Migration {migration.id.slice(-8)}</ResultTitle>
                      <ResultDetail>
                        {migration.results?.successful || 0} projects migrated successfully
                        - {new Date(migration.startedAt?.seconds * 1000 || Date.now()).toLocaleString()}
                      </ResultDetail>
                    </ResultInfo>
                  </ResultItem>
                ))}
              </ResultsList>
            </div>
          )}
        </div>
      </MigrationContainer>
    );
  }

  return (
    <MigrationContainer>
      <Header>
        <Title>My Project Migration</Title>
        <StatusBadge status={migrationState.status}>
          {migrationState.status}
        </StatusBadge>
      </Header>

      {migrationNeedStatus && (
        <div style={{ marginBottom: '20px', padding: '15px', background: '#f0f3ff', borderRadius: '6px' }}>
          <h3>Your Migration Status</h3>
          <p>
            You have <strong>{migrationNeedStatus.totalProjects}</strong> total projects.
            <br />
            <strong>{migrationNeedStatus.projectsToMigrate}</strong> projects need migration to enable collaboration features.
          </p>
        </div>
      )}

      <ActionSection>
        <Button 
          variant="secondary" 
          onClick={runDryRun}
          disabled={migrationState.status === 'running' || migrationState.status === 'validating'}
        >
          {migrationState.status === 'validating' ? 'Validating...' : 'Run Validation'}
        </Button>
        
        <Button 
          variant="primary" 
          onClick={runMigration}
          disabled={migrationState.status === 'running' || !validationResults}
        >
          {migrationState.status === 'running' ? 'Migrating...' : 'Start Migration'}
        </Button>
        
        <Button 
          variant="secondary" 
          onClick={loadMigrationHistory}
        >
          Refresh History
        </Button>
      </ActionSection>

      {migrationState.status === 'running' && (
        <ProgressSection>
          <div>Phase: {migrationState.currentPhase}</div>
          <ProgressBar>
            <ProgressFill percentage={migrationState.progress} />
          </ProgressBar>
          <div>{migrationState.progress}% Complete</div>
        </ProgressSection>
      )}

      {migrationState.error && (
        <ResultItem type="error">
          <ResultInfo>
            <ResultTitle>Migration Error</ResultTitle>
            <ErrorDetails>{migrationState.error}</ErrorDetails>
          </ResultInfo>
        </ResultItem>
      )}

      <ResultsSection>
        <TabNav>
          <Tab 
            active={activeTab === 'overview'} 
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </Tab>
          <Tab 
            active={activeTab === 'validation'} 
            onClick={() => setActiveTab('validation')}
          >
            Validation Results
          </Tab>
          <Tab 
            active={activeTab === 'results'} 
            onClick={() => setActiveTab('results')}
          >
            Migration Results
          </Tab>
          <Tab 
            active={activeTab === 'history'} 
            onClick={() => setActiveTab('history')}
          >
            History
          </Tab>
        </TabNav>

        {activeTab === 'overview' && (
          <OverviewContainer>
            <OverviewHeading>Migration Process</OverviewHeading>
            <OverviewParagraph>
              This tool will migrate <strong>your owned projects</strong> to use Role-Based Access Control (RBAC), enabling collaboration features.
            </OverviewParagraph>
            
            <OverviewSubheading>What happens during migration:</OverviewSubheading>
            <OverviewList>
              <li><strong>Validation:</strong> Check your projects for migration readiness</li>
              <li><strong>Migration:</strong> Add RBAC fields to enable invitations and role management</li>
              <li><strong>Verification:</strong> Ensure data consistency after migration</li>
            </OverviewList>
            
            <OverviewSubheading>What you get:</OverviewSubheading>
            <OverviewUList>
              <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle fontSize="small" />
                Ability to invite team members to your projects
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle fontSize="small" />
                Role-based permissions (Owner, Admin, Editor, Viewer)
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle fontSize="small" />
                Secure collaboration with granular access control
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle fontSize="small" />
                Invitation management system
              </li>
            </OverviewUList>
            
            <OverviewParagraph>
              <strong>Safe & Secure:</strong> Only your owned projects are affected. Migration includes validation, rollback protection, and verification.
            </OverviewParagraph>
          </OverviewContainer>
        )}

        {activeTab === 'validation' && renderValidationResults()}
        {activeTab === 'results' && renderMigrationResults()}
        
        {activeTab === 'history' && (
          <ResultsList>
            {migrationHistory.map((migration, index) => (
              <ResultItem key={index} type={migration.status === 'completed' ? 'success' : 'error'}>
                <ResultInfo>
                  <ResultTitle>Migration {migration.id.slice(-8)}</ResultTitle>
                  <ResultDetail>
                    {migration.results?.successful || 0} successful, {migration.results?.failed || 0} failed
                    - {new Date(migration.startedAt?.seconds * 1000 || Date.now()).toLocaleString()}
                  </ResultDetail>
                </ResultInfo>
              </ResultItem>
            ))}
          </ResultsList>
        )}
      </ResultsSection>
    </MigrationContainer>
  );
};

export default MigrationPanel;