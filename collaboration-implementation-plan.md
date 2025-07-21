# TaskFlow Collaboration Feature Implementation Plan

## Overview
This document provides a detailed, step-by-step plan to implement collaborative projects where users can share boards and tasks. The plan is specifically tailored to the current TaskFlow architecture and leverages existing infrastructure.

## Current Architecture Analysis

### ✅ Existing Foundation
- **Database Model**: Projects already have `members: [userId]` array
- **Security**: Firebase security rules support member access via `request.auth.uid in resource.data.members`
- **Access Control**: `validateProjectAccess()` function handles both owner and member permissions
- **State Management**: Zustand store manages projects/boards/tasks with proper synchronization
- **UI Components**: Modular React components with consistent styling patterns

### 🎯 What We're Adding
- User invitation system
- Enhanced member management UI
- Real-time collaboration features
- Role-based permissions (future)
- Activity tracking

## Phase 1: Core Member Management

### Step 1: Backend Functions (Week 1, Days 1-3)

#### 1.1 Update `backend-firebase/functions/src/projects.js`

Add these three functions after the existing `deleteProject` function (around line 250):

```javascript
// Invite user to project
exports.inviteUserToProject = onCall(async (request) => {
  const userId = validateAuth(request);
  const { projectId, email, role = 'editor' } = request.data;
  
  if (!projectId || !email) {
    throw new HttpsError('invalid-argument', 'Project ID and email are required');
  }
  
  const db = admin.firestore();
  
  try {
    // Validate project access and ownership
    const projectData = await validateProjectAccess(db, projectId, userId);
    
    if (projectData.owner !== userId) {
      throw new HttpsError('permission-denied', 'Only project owner can invite members');
    }
    
    // Check if user already exists in Firebase Auth by email
    let inviteeUser;
    try {
      inviteeUser = await admin.auth().getUserByEmail(email);
    } catch (error) {
      // User doesn't exist in Firebase Auth yet
      inviteeUser = null;
    }
    
    // Check if user is already a member
    if (inviteeUser && projectData.members.includes(inviteeUser.uid)) {
      throw new HttpsError('already-exists', 'User is already a member of this project');
    }
    
    // Create invitation
    const invitationRef = db.collection('invitations').doc();
    await invitationRef.set({
      projectId,
      projectName: projectData.name,
      inviterUserId: userId,
      inviterEmail: request.auth.token.email,
      inviteeEmail: email.toLowerCase(),
      inviteeUserId: inviteeUser?.uid || null,
      role,
      status: 'pending',
      createdAt: FieldValue.serverTimestamp(),
      expiresAt: FieldValue.serverTimestamp() + (7 * 24 * 60 * 60 * 1000) // 7 days
    });
    
    // TODO: Send email notification (implement in Phase 3)
    
    return { 
      invitationId: invitationRef.id,
      message: `Invitation sent to ${email}`
    };
  } catch (error) {
    console.error('Error inviting user:', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', 'Failed to invite user');
  }
});

// Accept project invitation
exports.acceptProjectInvitation = onCall(async (request) => {
  const userId = validateAuth(request);
  const { invitationId } = request.data;
  
  if (!invitationId) {
    throw new HttpsError('invalid-argument', 'Invitation ID is required');
  }
  
  const db = admin.firestore();
  
  try {
    const invitationDoc = await db.collection('invitations').doc(invitationId).get();
    
    if (!invitationDoc.exists) {
      throw new HttpsError('not-found', 'Invitation not found');
    }
    
    const invitation = invitationDoc.data();
    
    // Validate invitation
    if (invitation.status !== 'pending') {
      throw new HttpsError('invalid-argument', 'Invitation already processed');
    }
    
    if (invitation.inviteeUserId && invitation.inviteeUserId !== userId) {
      throw new HttpsError('permission-denied', 'Invitation not for this user');
    }
    
    if (!invitation.inviteeUserId && invitation.inviteeEmail !== request.auth.token.email) {
      throw new HttpsError('permission-denied', 'Invitation not for this email');
    }
    
    // Check if invitation expired
    const now = new Date();
    const expiresAt = invitation.expiresAt.toDate();
    if (now > expiresAt) {
      throw new HttpsError('deadline-exceeded', 'Invitation has expired');
    }
    
    // Add user to project members
    await db.runTransaction(async (transaction) => {
      const projectRef = db.collection('projects').doc(invitation.projectId);
      const projectDoc = await transaction.get(projectRef);
      
      if (!projectDoc.exists) {
        throw new HttpsError('not-found', 'Project no longer exists');
      }
      
      const projectData = projectDoc.data();
      
      // Check if user is already a member
      if (projectData.members.includes(userId)) {
        throw new HttpsError('already-exists', 'User is already a member');
      }
      
      // Add user to members array
      transaction.update(projectRef, {
        members: FieldValue.arrayUnion(userId),
        updatedAt: FieldValue.serverTimestamp()
      });
      
      // Update invitation status
      transaction.update(invitationDoc.ref, {
        status: 'accepted',
        acceptedAt: FieldValue.serverTimestamp(),
        inviteeUserId: userId
      });
    });
    
    return { success: true, projectId: invitation.projectId };
  } catch (error) {
    console.error('Error accepting invitation:', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', 'Failed to accept invitation');
  }
});

// Remove project member
exports.removeProjectMember = onCall(async (request) => {
  const userId = validateAuth(request);
  const { projectId, memberUserId } = request.data;
  
  if (!projectId || !memberUserId) {
    throw new HttpsError('invalid-argument', 'Project ID and member user ID are required');
  }
  
  if (userId === memberUserId) {
    throw new HttpsError('invalid-argument', 'Cannot remove yourself from project');
  }
  
  const db = admin.firestore();
  
  try {
    // Validate project access and ownership
    const projectData = await validateProjectAccess(db, projectId, userId);
    
    if (projectData.owner !== userId) {
      throw new HttpsError('permission-denied', 'Only project owner can remove members');
    }
    
    // Check if user is actually a member
    if (!projectData.members.includes(memberUserId)) {
      throw new HttpsError('not-found', 'User is not a member of this project');
    }
    
    // Remove user from members array
    await db.collection('projects').doc(projectId).update({
      members: FieldValue.arrayRemove(memberUserId),
      updatedAt: FieldValue.serverTimestamp()
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error removing member:', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', 'Failed to remove member');
  }
});

// Get project invitations (for the invited user)
exports.getMyInvitations = onCall(async (request) => {
  const userId = validateAuth(request);
  const userEmail = request.auth.token.email;
  
  const db = admin.firestore();
  
  try {
    // Get invitations by user ID or email
    const invitationsByUserId = await db.collection('invitations')
      .where('inviteeUserId', '==', userId)
      .where('status', '==', 'pending')
      .get();
      
    const invitationsByEmail = await db.collection('invitations')
      .where('inviteeEmail', '==', userEmail)
      .where('status', '==', 'pending')
      .get();
    
    // Combine and deduplicate
    const invitationMap = new Map();
    
    [...invitationsByUserId.docs, ...invitationsByEmail.docs].forEach(doc => {
      const data = doc.data();
      invitationMap.set(doc.id, {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.(),
        expiresAt: data.expiresAt?.toDate?.()
      });
    });
    
    return Array.from(invitationMap.values());
  } catch (error) {
    console.error('Error getting invitations:', error);
    throw new HttpsError('internal', 'Failed to get invitations');
  }
});
```

#### 1.2 Create New Firestore Collection Structure

Add to your Firebase console or initialization script:

```javascript
// Collection: invitations
// Document structure:
{
  projectId: string,
  projectName: string,
  inviterUserId: string,
  inviterEmail: string,
  inviteeEmail: string,
  inviteeUserId: string | null, // null if user doesn't exist yet
  role: 'admin' | 'editor' | 'viewer',
  status: 'pending' | 'accepted' | 'declined' | 'expired',
  createdAt: timestamp,
  acceptedAt: timestamp | null,
  expiresAt: timestamp
}
```

### Step 2: Frontend Store Updates (Week 1, Days 4-5)

#### 2.1 Update `frontend/src/store.js`

Add these properties to the store state (around line 15, after existing state):

```javascript
// Add to existing state
  // ... existing state ...
  
  // Collaboration state
  projectMembers: [], // Current project member details
  invitations: [], // User's pending invitations
  collaborationLoading: false,
```

Add these actions to the store (around line 700, before the closing bracket):

```javascript
  // Collaboration Actions
  inviteUserToProject: async (projectId, email, role = 'editor') => {
    set({ collaborationLoading: true, error: null });
    try {
      const result = await inviteUserToProjectAPI(projectId, email, role);
      set({ collaborationLoading: false });
      return result;
    } catch (error) {
      console.error('Store: Error inviting user:', error);
      set({ error, collaborationLoading: false });
      throw error;
    }
  },
  
  removeProjectMember: async (projectId, memberUserId) => {
    set({ collaborationLoading: true, error: null });
    try {
      await removeProjectMemberAPI(projectId, memberUserId);
      
      // Update local state - remove member from current project
      set((state) => ({
        projects: state.projects.map(project => 
          project._id === projectId 
            ? { ...project, members: project.members.filter(id => id !== memberUserId) }
            : project
        ),
        selectedProject: state.selectedProject?._id === projectId
          ? { 
              ...state.selectedProject, 
              members: state.selectedProject.members.filter(id => id !== memberUserId)
            }
          : state.selectedProject,
        projectMembers: state.projectMembers.filter(member => member.uid !== memberUserId),
        collaborationLoading: false
      }));
    } catch (error) {
      console.error('Store: Error removing member:', error);
      set({ error, collaborationLoading: false });
      throw error;
    }
  },
  
  loadMyInvitations: async () => {
    set({ collaborationLoading: true, error: null });
    try {
      const invitations = await getMyInvitationsAPI();
      set({ invitations, collaborationLoading: false });
    } catch (error) {
      console.error('Store: Error loading invitations:', error);
      set({ error, collaborationLoading: false });
    }
  },
  
  acceptProjectInvitation: async (invitationId) => {
    set({ collaborationLoading: true, error: null });
    try {
      const result = await acceptProjectInvitationAPI(invitationId);
      
      // Remove invitation from local state
      set((state) => ({
        invitations: state.invitations.filter(inv => inv.id !== invitationId),
        collaborationLoading: false
      }));
      
      // Reload projects to include the new project
      await get().loadProjects();
      
      return result;
    } catch (error) {
      console.error('Store: Error accepting invitation:', error);
      set({ error, collaborationLoading: false });
      throw error;
    }
  },
  
  loadProjectMembers: async (projectId) => {
    set({ collaborationLoading: true, error: null });
    try {
      // Get project to get member IDs
      const project = get().projects.find(p => p._id === projectId) || get().selectedProject;
      if (!project) {
        throw new Error('Project not found');
      }
      
      // Get member details from Firebase Auth (this would need a new backend function)
      const members = await getProjectMembersAPI(project.members);
      set({ projectMembers: members, collaborationLoading: false });
    } catch (error) {
      console.error('Store: Error loading project members:', error);
      set({ error, collaborationLoading: false });
    }
  },
```

#### 2.2 Create API Functions in `frontend/src/services/api.js`

Add these functions to the existing API file (around line 200+):

```javascript
// Collaboration API functions
export const inviteUserToProjectAPI = async (projectId, email, role) => {
  try {
    const inviteUserToProject = httpsCallable(functions, 'inviteUserToProject');
    const result = await inviteUserToProject({ projectId, email, role });
    return result.data;
  } catch (error) {
    console.error('API Error inviting user:', error);
    throw error;
  }
};

export const removeProjectMemberAPI = async (projectId, memberUserId) => {
  try {
    const removeProjectMember = httpsCallable(functions, 'removeProjectMember');
    const result = await removeProjectMember({ projectId, memberUserId });
    return result.data;
  } catch (error) {
    console.error('API Error removing member:', error);
    throw error;
  }
};

export const getMyInvitationsAPI = async () => {
  try {
    const getMyInvitations = httpsCallable(functions, 'getMyInvitations');
    const result = await getMyInvitations();
    return result.data;
  } catch (error) {
    console.error('API Error getting invitations:', error);
    throw error;
  }
};

export const acceptProjectInvitationAPI = async (invitationId) => {
  try {
    const acceptProjectInvitation = httpsCallable(functions, 'acceptProjectInvitation');
    const result = await acceptProjectInvitation({ invitationId });
    return result.data;
  } catch (error) {
    console.error('API Error accepting invitation:', error);
    throw error;
  }
};

// Helper function to get member details (requires new backend function)
export const getProjectMembersAPI = async (memberIds) => {
  try {
    const getProjectMembers = httpsCallable(functions, 'getProjectMembers');
    const result = await getProjectMembers({ memberIds });
    return result.data;
  } catch (error) {
    console.error('API Error getting members:', error);
    throw error;
  }
};
```

### Step 3: UI Components (Week 2)

#### 3.1 Create `frontend/src/components/ProjectMembersModal.jsx`

```jsx
import React, { useState, useEffect } from 'react';
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
  justify-content: between;
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
```

#### 3.2 Create `frontend/src/components/InviteMemberForm.jsx`

```jsx
import React, { useState } from 'react';
import styled from '@emotion/styled';
import { FormGroup, Label, Input, Button, ErrorMessage } from './common/FormComponents';

const FormContainer = styled.div`
  background: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
`;

const FormActions = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 16px;
`;

const CancelButton = styled(Button)`
  background: #6c757d;
  
  &:hover {
    background: #545b62;
  }
`;

const InviteMemberForm = ({ onInvite, onCancel, loading }) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('editor');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!email.trim()) {
      setError('Email is required');
      return;
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Please enter a valid email address');
      return;
    }
    
    try {
      await onInvite(email.trim().toLowerCase(), role);
      setEmail('');
      setRole('editor');
    } catch (error) {
      setError(error.message);
    }
  };

  return (
    <FormContainer>
      <form onSubmit={handleSubmit}>
        <FormGroup>
          <Label htmlFor="memberEmail">Email Address</Label>
          <Input
            id="memberEmail"
            type="email"
            placeholder="Enter email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            required
          />
        </FormGroup>
        
        <FormGroup>
          <Label htmlFor="memberRole">Role</Label>
          <select
            id="memberRole"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            disabled={loading}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              fontSize: '1rem',
              background: 'white'
            }}
          >
            <option value="viewer">Viewer (Read-only)</option>
            <option value="editor">Editor (Can edit)</option>
            <option value="admin">Admin (Full access)</option>
          </select>
        </FormGroup>
        
        {error && <ErrorMessage>{error}</ErrorMessage>}
        
        <FormActions>
          <Button type="submit" disabled={loading}>
            {loading ? 'Sending...' : 'Send Invitation'}
          </Button>
          <CancelButton type="button" onClick={onCancel} disabled={loading}>
            Cancel
          </CancelButton>
        </FormActions>
      </form>
    </FormContainer>
  );
};

export default InviteMemberForm;
```

#### 3.3 Update `frontend/src/components/ProjectForm.jsx`

Find the form group with project name (around line 60) and add the members button after it:

```jsx
// Add this import at the top
import ProjectMembersModal from './ProjectMembersModal';

// Add state for members modal
const [showMembersModal, setShowMembersModal] = useState(false);

// Add this JSX after the project name FormGroup (around line 80):
{project && (
  <FormGroup>
    <Label>Project Members</Label>
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: '12px',
      padding: '10px 0'
    }}>
      <span style={{ color: '#666', fontSize: '0.9rem' }}>
        {project.members?.length || 1} member{(project.members?.length || 1) !== 1 ? 's' : ''}
      </span>
      <Button
        type="button"
        onClick={() => setShowMembersModal(true)}
        style={{ 
          padding: '6px 12px', 
          fontSize: '0.85rem',
          background: '#6c757d'
        }}
      >
        Manage Members
      </Button>
    </div>
  </FormGroup>
)}

// Add this before the closing component:
{showMembersModal && project && (
  <ProjectMembersModal
    isOpen={showMembersModal}
    onClose={() => setShowMembersModal(false)}
    project={project}
  />
)}
```

#### 3.4 Update `frontend/src/components/ProjectsList.jsx`

Add member count display to project cards. Find the ProjectContent styled component usage and add:

```jsx
// Add after project description (around line 120):
<div style={{ 
  display: 'flex', 
  alignItems: 'center', 
  gap: '8px',
  marginTop: '8px',
  fontSize: '0.85rem',
  color: '#666'
}}>
  <FaUsers size={12} />
  {project.members?.length || 1} member{(project.members?.length || 1) !== 1 ? 's' : ''}
</div>
```

Don't forget to import FaUsers:
```jsx
import { FaUsers } from 'react-icons/fa';
```

## Phase 2: Enhanced Features (Week 3-4)

### Step 4: Invitations UI (Week 3, Days 1-2)

#### 4.1 Create `frontend/src/components/InvitationsPanel.jsx`

```jsx
import React, { useEffect } from 'react';
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
```

#### 4.2 Add Invitations Panel to Sidebar

Update `frontend/src/components/Sidebar.jsx` to include the invitations panel:

```jsx
// Add import
import InvitationsPanel from './InvitationsPanel';

// Add after the ProjectsList component (around line 150):
<InvitationsPanel />
```

### Step 5: Real-time Collaboration (Week 4)

#### 5.1 Add Real-time Listeners

Update `frontend/src/store.js` to include real-time listeners for project changes:

```javascript
// Add to store actions:
subscribeToProjectUpdates: (projectId) => {
  const db = getFirestore();
  const projectRef = doc(db, 'projects', projectId);
  
  return onSnapshot(projectRef, (doc) => {
    if (doc.exists()) {
      const updatedProject = { id: doc.id, ...doc.data() };
      
      set((state) => ({
        projects: state.projects.map(project => 
          project._id === projectId ? { ...project, ...updatedProject, _id: projectId } : project
        ),
        selectedProject: state.selectedProject?._id === projectId 
          ? { ...state.selectedProject, ...updatedProject }
          : state.selectedProject
      }));
    }
  });
},
```

## Phase 3: Testing & Polish (Week 5)

### Step 6: Testing Plan

1. **Unit Tests**: Test each new API function
2. **Integration Tests**: Test complete invitation flow
3. **UI Tests**: Test member management modals
4. **Real-time Tests**: Test collaborative editing

### Step 7: Security Validation

1. Verify Firebase security rules work correctly
2. Test permission boundaries
3. Validate input sanitization
4. Test edge cases (expired invitations, etc.)

## Deployment Checklist

### Backend Deployment
- [ ] Deploy Firebase functions
- [ ] Update Firestore security rules if needed
- [ ] Test all new endpoints

### Frontend Deployment
- [ ] Build and test locally
- [ ] Update environment variables if needed
- [ ] Deploy to production
- [ ] Test collaboration features end-to-end

### Post-Deployment
- [ ] Monitor error logs
- [ ] Test with real users
- [ ] Gather feedback for improvements

## Future Enhancements

### Phase 4: Advanced Features
1. **Role-based Permissions**: Implement viewer/editor/admin roles
2. **Task Assignment**: Assign tasks to specific members
3. **Activity Feed**: Track member actions
4. **Notifications**: Email notifications for invitations
5. **Presence Indicators**: Show who's online
6. **Comments**: Add comments to tasks
7. **Mentions**: @ mention other members

### Phase 5: Advanced Collaboration
1. **Concurrent Editing**: Real-time task editing
2. **Conflict Resolution**: Handle simultaneous edits
3. **Audit Trail**: Track all changes
4. **Workspace**: Multiple projects per workspace

## Notes for Implementation

1. **Incremental Deployment**: Deploy each phase separately
2. **Backward Compatibility**: Ensure existing projects continue working
3. **Performance**: Monitor impact of real-time features
4. **User Experience**: Provide clear feedback for all actions
5. **Error Handling**: Graceful handling of network issues

This plan provides a complete roadmap for implementing collaborative features while leveraging your existing architecture. Each step builds upon the previous one, ensuring a smooth development process.