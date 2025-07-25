import { useEffect, useState } from 'react';
import styled from '@emotion/styled';
import { FaEnvelope, FaCheck, FaTimes, FaClock } from 'react-icons/fa';
import { useStore } from '../store';
import { formatDateForDisplay } from '../utils/dateUtils';
import ConfirmationModal from './common/ConfirmationModal';

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
  flex-direction: column;
  gap: 12px;
  min-width: 0;
  overflow: hidden;
`;

const InvitationInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  overflow: hidden;
`;

const ProjectName = styled.span`
  font-weight: 600;
  color: #333;
  font-size: 0.95rem;
`;

const InviterInfo = styled.span`
  font-size: 0.8rem;
  color: #666;
  line-height: 1.3;
`;

const InvitationActions = styled.div`
  display: flex;
  gap: 8px;
  justify-content: flex-start;
`;

const ActionButton = styled.button`
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8rem;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 4px;
  flex: 1;
  justify-content: center;
  
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
    acceptProjectInvitation,
    declineProjectInvitation 
  } = useStore();

  const [invitationToAccept, setInvitationToAccept] = useState(null);
  const [invitationToDecline, setInvitationToDecline] = useState(null);

  useEffect(() => {
    loadMyInvitations();
  }, [loadMyInvitations]);

  const handleAcceptConfirm = async () => {
    if (!invitationToAccept) return;
    
    try {
      await acceptProjectInvitation(invitationToAccept.id);
      setInvitationToAccept(null);
    } catch (error) {
      console.error('Failed to accept invitation:', error);
    }
  };

  const handleDeclineConfirm = async () => {
    if (!invitationToDecline) return;
    
    try {
      await declineProjectInvitation(invitationToDecline.id);
      setInvitationToDecline(null);
    } catch (error) {
      console.error('Failed to decline invitation:', error);
    }
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
                Invited {formatDateForDisplay(invitation.createdAt)}
              </InviterInfo>
            </InvitationInfo>
            
            <InvitationActions>
              <ActionButton 
                className="accept"
                onClick={() => setInvitationToAccept(invitation)}
                disabled={collaborationLoading}
              >
                <FaCheck size={12} />
                Accept
              </ActionButton>
              <ActionButton 
                className="decline"
                onClick={() => setInvitationToDecline(invitation)}
                disabled={collaborationLoading}
              >
                <FaTimes size={12} />
                Decline
              </ActionButton>
            </InvitationActions>
          </InvitationItem>
        ))}
      </InvitationsList>
      
      {/* Accept Confirmation Modal */}
      {invitationToAccept && (
        <ConfirmationModal
          isOpen={true}
          onClose={() => setInvitationToAccept(null)}
          onConfirm={handleAcceptConfirm}
          title="Accept Project Invitation"
          message={`Are you sure you want to accept the invitation to join "${invitationToAccept.projectName}"?`}
          confirmText="Accept"
          cancelText="Cancel"
          modalType="success"
        />
      )}
      
      {/* Decline Confirmation Modal */}
      {invitationToDecline && (
        <ConfirmationModal
          isOpen={true}
          onClose={() => setInvitationToDecline(null)}
          onConfirm={handleDeclineConfirm}
          title="Decline Project Invitation"
          message={`Are you sure you want to decline the invitation to join "${invitationToDecline.projectName}"?`}
          confirmText="Decline"
          cancelText="Cancel"
          modalType="danger"
        />
      )}
    </PanelContainer>
  );
};

export default InvitationsPanel;