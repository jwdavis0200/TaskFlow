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
  background: var(--color-surface);
  border-radius: 16px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.25);
  border: 1px solid var(--color-border);
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 32px;
  background: linear-gradient(135deg, var(--brand-gradient-start) 0%, var(--brand-gradient-end) 100%);
  color: #fff;
`;

const Title = styled.h2`
  margin: 0;
  font-size: 1.5rem;
  color: #fff;
  font-weight: 600;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px;
  color: rgba(255, 255, 255, 0.85);
  border-radius: 8px;
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.2);
    color: #fff;
    transform: scale(1.05);
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
    background: var(--scrollbar-track);
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb {
    background: var(--scrollbar-thumb);
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: var(--scrollbar-thumb);
  }
`;

const MembersList = styled.div`
  margin-bottom: 24px;
`;

const MemberItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  margin-bottom: 12px;
  background: var(--color-surface-elevated-1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  transition: all 0.3s ease;
  
  &:hover {
    background: var(--color-surface-elevated-2);
    transform: translateY(-2px);
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.25);
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
  background: linear-gradient(135deg, var(--brand-gradient-start) 0%, var(--brand-gradient-end) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 600;
`;

const MemberDetails = styled.div`
  display: flex;
  flex-direction: column;
`;

const MemberEmail = styled.span`
  font-weight: 500;
  color: var(--color-text-primary);
  font-size: 0.95rem;
`;

const MemberRole = styled.span`
  font-size: 0.85rem;
  color: var(--color-text-secondary);
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
  background: color-mix(in oklab, var(--color-primary) 12%, transparent);
  border: 1px solid color-mix(in oklab, var(--color-primary) 35%, transparent);
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 8px;
  color: var(--color-primary);
  font-size: 12px;
  font-weight: 500;
  transition: all 0.3s ease;
  
  &:hover {
    background: linear-gradient(45deg, var(--brand-gradient-start), var(--brand-gradient-end));
    color: #fff;
    transform: translateY(-2px);
    box-shadow: 0 4px 15px color-mix(in oklab, var(--brand-gradient-start) 30%, transparent);
  }
  
  &.danger {
    color: var(--color-danger-text);
    border-color: color-mix(in oklab, var(--color-danger-text) 30%, transparent);
    
    &:hover {
      background: linear-gradient(45deg, color-mix(in oklab, var(--color-danger-text) 90%, #000), var(--color-danger-text));
      color: #fff;
      box-shadow: 0 4px 15px color-mix(in oklab, var(--color-danger-text) 30%, transparent);
    }
  }
`;

const InviteSection = styled.div`
  padding-top: 24px;
  margin-top: 24px;
  background: color-mix(in oklab, var(--color-primary) 8%, transparent);
  border-radius: 12px;
  padding: 24px;
  border: 1px solid var(--color-border);
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
  color: var(--color-primary);
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
`;

const ErrorMessage = styled.p`
  color: var(--color-danger-text);
  background: color-mix(in oklab, var(--color-danger-text) 10%, transparent);
  border: 1px solid color-mix(in oklab, var(--color-danger-text) 30%, transparent);
  padding: 16px;
  border-radius: 12px;
  font-size: 0.9rem;
  margin-top: 16px;
  font-weight: 500;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 48px 32px;
  color: var(--color-primary);
  background: var(--color-surface);
  border-radius: 12px;
  font-weight: 500;
`;

const LoadingState = styled.div`
  text-align: center;
  padding: 32px 24px;
  color: var(--color-primary);
  background: var(--color-surface);
  border-radius: 12px;
  font-weight: 500;
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
          modalType="danger"
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
          modalType="info"
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