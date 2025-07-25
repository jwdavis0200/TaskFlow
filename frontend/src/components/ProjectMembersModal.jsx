import { useState, useEffect } from 'react';
import styled from '@emotion/styled';
import { FaTimes, FaUserPlus, FaTrash, FaCrown, FaUser } from 'react-icons/fa';
import { useStore } from '../store';
import Modal from './common/Modal';
import InviteMemberForm from './InviteMemberForm';
import ConfirmationModal from './common/ConfirmationModal';

const ModalContentInner = styled.div`
  width: 100%;
  padding: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  height: 100%;
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
  flex: 1;
  overflow-y: auto;
  
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

const ErrorMessage = styled.p`
  color: #dc3545;
  background-color: rgba(220, 53, 69, 0.1);
  border: 1px solid rgba(220, 53, 69, 0.2);
  padding: 12px;
  border-radius: 6px;
  font-size: 0.9rem;
  margin-top: 16px;
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
    removeProjectMemberSecure,
    changeUserRole,
    canInviteMembers,
    canRemoveMembers,
    getUserRole,
    isProjectOwner,
    user 
  } = useStore();
  
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [memberToChangeRole, setMemberToChangeRole] = useState(null);
  const [newRole, setNewRole] = useState('');
  const [isChangingRole, setIsChangingRole] = useState(false);
  const [invitationToSend, setInvitationToSend] = useState(null);
  const [invitationError, setInvitationError] = useState(null);

  useEffect(() => {
    if (isOpen && project) {
      loadProjectMembers(project._id);
    }
  }, [isOpen, project, loadProjectMembers]);

  const handleInviteMember = async (email, role) => {
    setInvitationToSend({ email, role });
  };

  const handleInviteMemberConfirm = async () => {
    if (!invitationToSend) return;
    setInvitationError(null); // Reset error on new submission
    
    try {
      await inviteUserToProject(project._id, invitationToSend.email, invitationToSend.role);
      setShowInviteForm(false);
      setInvitationToSend(null);
    } catch (error) {
      console.error('Failed to send invitation:', error);
      if (error.code === 'functions/already-exists') {
        setInvitationError(error.message);
      } else {
        setInvitationError('An unexpected error occurred. Please try again.');
      }
    }
  };

  const handleRemoveMember = async () => {
    if (!memberToRemove) return;
    
    setIsRemoving(true);
    try {
      await removeProjectMemberSecure(project._id, memberToRemove.uid);
      setMemberToRemove(null);
    } catch (error) {
      console.error('Failed to remove member:', error);
    } finally {
      setIsRemoving(false);
    }
  };

  const handleChangeRole = async () => {
    if (!memberToChangeRole || !newRole) return;
    
    setIsChangingRole(true);
    try {
      await changeUserRole(project._id, memberToChangeRole.uid, newRole);
      setMemberToChangeRole(null);
      setNewRole('');
      // Reload members to get updated role info
      await loadProjectMembers(project._id);
    } catch (error) {
      console.error('Failed to change role:', error);
    } finally {
      setIsChangingRole(false);
    }
  };

  const getCurrentUserRole = () => getUserRole(project?._id);
  const canInvite = canInviteMembers(project?._id);
  const canRemove = canRemoveMembers(project?._id);
  const isOwner = isProjectOwner(project?._id);

  const getMemberRole = (member) => {
    if (project?.owner === member.uid) return 'owner';
    return project?.memberRoles?.[member.uid] || 'viewer';
  };
  
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
      <Modal isOpen={isOpen} onClose={onClose} wide>
        <ModalContentInner>
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
                              {(() => {
                                const role = getMemberRole(member);
                                const roleConfig = {
                                  owner: { icon: FaCrown, label: 'Owner', color: '#ffd700' },
                                  admin: { icon: FaUser, label: 'Admin', color: '#007bff' },
                                  editor: { icon: FaUser, label: 'Editor', color: '#28a745' },
                                  viewer: { icon: FaUser, label: 'Viewer', color: '#6c757d' }
                                };
                                const config = roleConfig[role] || roleConfig.viewer;
                                const IconComponent = config.icon;
                                return (
                                  <>
                                    <IconComponent size={12} style={{ color: config.color }} />
                                    {config.label}
                                  </>
                                );
                              })()}
                            </MemberRole>
                          </MemberDetails>
                        </MemberInfo>
                        
                        {canRemove && member.uid !== project.owner && member.uid !== user?.uid && (
                          <MemberActions>
                            {/* Role change dropdown for owner/admin */}
                            {(isOwner || (getCurrentUserRole() === 'admin' && getMemberRole(member) !== 'admin')) && (
                              <select
                                value={getMemberRole(member)}
                                onChange={(e) => {
                                  const selectedRole = e.target.value;
                                  if (selectedRole !== getMemberRole(member)) {
                                    setMemberToChangeRole(member);
                                    setNewRole(selectedRole);
                                  }
                                }}
                                style={{
                                  marginRight: '8px',
                                  padding: '4px 8px',
                                  border: '1px solid #ddd',
                                  borderRadius: '4px',
                                  fontSize: '12px'
                                }}
                              >
                                <option value="viewer">Viewer</option>
                                <option value="editor">Editor</option>
                                {isOwner && <option value="admin">Admin</option>}
                              </select>
                            )}
                            
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
                
                {canInvite && (
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
                        onCancel={() => {
                          setShowInviteForm(false);
                          setInvitationError(null);
                        }}
                        loading={collaborationLoading}
                      />
                    ) : (
                      <button
                        onClick={() => {
                          setShowInviteForm(true);
                          setInvitationError(null);
                        }}
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
                    {invitationError && <ErrorMessage>{invitationError}</ErrorMessage>}
                  </InviteSection>
                )}
              </>
            )}
          </Content>
        </ModalContentInner>
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
      
      {memberToChangeRole && (
        <ConfirmationModal
          isOpen={true}
          title="Change Member Role"
          message={`Change ${memberToChangeRole.email}'s role to ${newRole}?`}
          warningText={`This will ${newRole === 'viewer' ? 'restrict' : 'modify'} their access permissions in this project.`}
          onConfirm={handleChangeRole}
          onClose={() => {
            setMemberToChangeRole(null);
            setNewRole('');
          }}
          isLoading={isChangingRole}
        />
      )}
      
      {invitationToSend && (
        <ConfirmationModal
          isOpen={true}
          title="Send Project Invitation"
          message={`Send an invitation to ${invitationToSend.email} to join "${project?.name}" as ${invitationToSend.role}?`}
          confirmText="Send Invitation"
          cancelText="Cancel"
          onConfirm={handleInviteMemberConfirm}
          onClose={() => setInvitationToSend(null)}
          modalType="default"
        />
      )}
    </>
  );
};

export default ProjectMembersModal;