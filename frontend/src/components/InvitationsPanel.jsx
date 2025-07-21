import { useEffect } from 'react';
import styled from '@emotion/styled';
import { FaEnvelope, FaCheck, FaTimes, FaClock } from 'react-icons/fa';
import { useStore } from '../store';

const PanelContainer = styled.div`
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
  margin-bottom: 16px;
`;

const PanelHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  font-weight: 600;
  color: #333;
`;

const InvitationsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const InvitationItem = styled.div`
  background: white;
  padding: 12px;
  border-radius: 6px;
  border: 1px solid #e0e0e0;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const InvitationInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const ProjectName = styled.span`
  font-weight: 500;
  color: #333;
`;

const InviterInfo = styled.span`
  font-size: 0.85rem;
  color: #666;
`;

const InvitationActions = styled.div`
  display: flex;
  gap: 8px;
`;

const ActionButton = styled.button`
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  gap: 4px;
  
  &.accept {
    background: #28a745;
    color: white;
    
    &:hover {
      background: #218838;
    }
  }
  
  &.decline {
    background: #dc3545;
    color: white;
    
    &:hover {
      background: #c82333;
    }
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 16px;
  color: #666;
  font-size: 0.9rem;
`;

const InvitationsPanel = () => {
  const { 
    invitations, 
    collaborationLoading, 
    loadMyInvitations, 
    acceptProjectInvitation 
  } = useStore();

  useEffect(() => {
    loadMyInvitations();
  }, [loadMyInvitations]);

  const handleAccept = async (invitationId) => {
    try {
      await acceptProjectInvitation(invitationId);
      alert('Invitation accepted! Project added to your list.');
    } catch (error) {
      alert('Failed to accept invitation: ' + error.message);
    }
  };

  const handleDecline = async (invitationId) => {
    // TODO: Implement decline invitation
    alert('Decline functionality coming soon');
  };

  if (invitations.length === 0) {
    return null; // Don't show panel if no invitations
  }

  return (
    <PanelContainer>
      <PanelHeader>
        <FaEnvelope />
        Project Invitations ({invitations.length})
      </PanelHeader>
      
      <InvitationsList>
        {invitations.map((invitation) => (
          <InvitationItem key={invitation.id}>
            <InvitationInfo>
              <ProjectName>{invitation.projectName}</ProjectName>
              <InviterInfo>
                Invited by {invitation.inviterEmail}
              </InviterInfo>
              <InviterInfo>
                <FaClock size={10} style={{ marginRight: 4 }} />
                {invitation.createdAt ? 
                  new Date(invitation.createdAt).toLocaleDateString() : 
                  'Recently'
                }
              </InviterInfo>
            </InvitationInfo>
            
            <InvitationActions>
              <ActionButton 
                className="accept"
                onClick={() => handleAccept(invitation.id)}
                disabled={collaborationLoading}
              >
                <FaCheck size={12} />
                Accept
              </ActionButton>
              <ActionButton 
                className="decline"
                onClick={() => handleDecline(invitation.id)}
                disabled={collaborationLoading}
              >
                <FaTimes size={12} />
                Decline
              </ActionButton>
            </InvitationActions>
          </InvitationItem>
        ))}
      </InvitationsList>
    </PanelContainer>
  );
};

export default InvitationsPanel;