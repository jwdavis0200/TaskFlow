import { useState, useEffect } from 'react';
import styled from '@emotion/styled';
import { FaTimes, FaUserPlus, FaTrash, FaCrown, FaUser } from 'react-icons/fa';
import { useStore } from '../store';
import Modal from './common/Modal';
import InviteMemberForm from './InviteMemberForm';
import ConfirmationModal from './common/ConfirmationModal';

const ModalContent = styled.div`
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
  background: white;
  border-radius: 12px;
  padding: 0;
  overflow: hidden;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 32px;
  border-bottom: 1px solid #e0e0e0;
  background: #f8f9fa;
`;

const Title = styled.h2`
  margin: 0;
  font-size: 1.5rem;
  color: #333;
  font-weight: 600;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px;
  color: #666;
  border-radius: 4px;
  
  &:hover {
    background: rgba(0, 0, 0, 0.05);
    color: #333;
  }
`;

const Content = styled.div`
  padding: 24px 32px;
  max-height: 60vh;
  overflow-y: auto;
`;

const MembersList = styled.div`
  margin-bottom: 24px;
`;

const MemberItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  margin-bottom: 8px;
  background: white;
  
  &:hover {
    background: #f8f9fa;
  }
`;

const MemberInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const MemberAvatar = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
`;

const MemberDetails = styled.div`
  display: flex;
  flex-direction: column;
`;

const MemberEmail = styled.span`
  font-weight: 500;
  color: #333;
  font-size: 0.95rem;
`;

const MemberRole = styled.span`
  font-size: 0.85rem;
  color: #666;
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 2px;
`;

const MemberActions = styled.div`
  display: flex;
  gap: 8px;
`;

const ActionButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px;
  border-radius: 4px;
  color: #666;
  
  &:hover {
    background: rgba(0, 0, 0, 0.05);
    color: #333;
  }
  
  &.danger:hover {
    background: rgba(220, 53, 69, 0.1);
    color: #dc3545;
  }
`;

const InviteSection = styled.div`
  border-top: 1px solid #e0e0e0;
  padding-top: 24px;
`;

const InviteHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
`;

const InviteTitle = styled.h3`
  margin: 0;
  font-size: 1.1rem;
  color: #333;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 32px;
  color: #666;
`;

const LoadingState = styled.div`
  text-align: center;
  padding: 24px;
  color: #666;
`;

const ProjectMembersModal = ({ isOpen, onClose, project }) => {
  const { 
    projectMembers, 
    collaborationLoading, 
    loadProjectMembers, 
    inviteUserToProject,
    removeProjectMember,
    user 
  } = useStore();
  
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState(null);
  const [isRemoving, setIsRemoving] = useState(false);

  useEffect(() => {
    if (isOpen && project) {
      loadProjectMembers(project._id);
    }
  }, [isOpen, project, loadProjectMembers]);

  const handleInviteMember = async (email, role) => {
    try {
      await inviteUserToProject(project._id, email, role);
      setShowInviteForm(false);
      // Show success message
      alert('Invitation sent successfully!');
    } catch (error) {
      alert('Failed to send invitation: ' + error.message);
    }
  };

  const handleRemoveMember = async () => {
    if (!memberToRemove) return;
    
    setIsRemoving(true);
    try {
      await removeProjectMember(project._id, memberToRemove.uid);
      setMemberToRemove(null);
    } catch (error) {
      alert('Failed to remove member: ' + error.message);
    } finally {
      setIsRemoving(false);
    }
  };

  const isOwner = project?.owner === user?.uid;
  
  // Debug logging
  console.log('ProjectMembersModal Debug:', {
    project,
    user,
    isOwner,
    projectMembers,
    collaborationLoading
  });

  if (!isOpen) return null;

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalContent>
          <Header>
            <Title>Project Members</Title>
            <CloseButton onClick={onClose}>
              <FaTimes />
            </CloseButton>
          </Header>
          
          <Content>
            {collaborationLoading ? (
              <LoadingState>Loading members...</LoadingState>
            ) : (
              <>
                <MembersList>
                  {projectMembers.length === 0 ? (
                    <EmptyState>
                      <FaUser size={24} style={{ marginBottom: 8, opacity: 0.5 }} />
                      <p>No members found</p>
                    </EmptyState>
                  ) : (
                    projectMembers.map((member) => (
                      <MemberItem key={member.uid}>
                        <MemberInfo>
                          <MemberAvatar>
                            {member.email?.charAt(0).toUpperCase()}
                          </MemberAvatar>
                          <MemberDetails>
                            <MemberEmail>{member.email}</MemberEmail>
                            <MemberRole>
                              {member.uid === project.owner ? (
                                <>
                                  <FaCrown size={12} />
                                  Owner
                                </>
                              ) : (
                                <>
                                  <FaUser size={12} />
                                  Member
                                </>
                              )}
                            </MemberRole>
                          </MemberDetails>
                        </MemberInfo>
                        
                        {isOwner && member.uid !== project.owner && (
                          <MemberActions>
                            <ActionButton 
                              className="danger"
                              onClick={() => setMemberToRemove(member)}
                              title="Remove member"
                            >
                              <FaTrash size={14} />
                            </ActionButton>
                          </MemberActions>
                        )}
                      </MemberItem>
                    ))
                  )}
                </MembersList>
                
                {isOwner && (
                  <InviteSection>
                    <InviteHeader>
                      <InviteTitle>
                        <FaUserPlus />
                        Invite New Member
                      </InviteTitle>
                    </InviteHeader>
                    
                    {showInviteForm ? (
                      <InviteMemberForm
                        onInvite={handleInviteMember}
                        onCancel={() => setShowInviteForm(false)}
                        loading={collaborationLoading}
                      />
                    ) : (
                      <button
                        onClick={() => setShowInviteForm(true)}
                        style={{
                          background: '#007bff',
                          color: 'white',
                          border: 'none',
                          padding: '12px 24px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}
                      >
                        <FaUserPlus />
                        Invite Member
                      </button>
                    )}
                  </InviteSection>
                )}
              </>
            )}
          </Content>
        </ModalContent>
      </Modal>
      
      {memberToRemove && (
        <ConfirmationModal
          isOpen={true}
          title="Remove Member"
          message={`Are you sure you want to remove ${memberToRemove.email} from this project?`}
          warningText="They will lose access to all boards and tasks in this project."
          onConfirm={handleRemoveMember}
          onClose={() => setMemberToRemove(null)}
          isLoading={isRemoving}
        />
      )}
    </>
  );
};

export default ProjectMembersModal;