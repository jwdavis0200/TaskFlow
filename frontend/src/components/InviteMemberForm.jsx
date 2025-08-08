import { useState } from 'react';
import styled from '@emotion/styled';
import { 
  FormContainer,
  FormGroup,
  Label,
  Input,
  ErrorMessage,
  FormActions,
  PrimaryButton,
  SecondaryButton,
  Select,
} from './common/FormComponents';

const Inner = styled.div`
  padding: 20px;
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
      <Inner>
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
          <Select
            id="memberRole"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            disabled={loading}
          >
            <option value="viewer">Viewer (Read-only)</option>
            <option value="editor">Editor (Can edit)</option>
            <option value="admin">Admin (Full access)</option>
          </Select>
        </FormGroup>
        
        {error && <ErrorMessage>{error}</ErrorMessage>}
        
        <FormActions>
          <PrimaryButton type="submit" disabled={loading}>
            {loading ? 'Sending...' : 'Send Invitation'}
          </PrimaryButton>
          <SecondaryButton type="button" onClick={onCancel} disabled={loading}>
            Cancel
          </SecondaryButton>
        </FormActions>
      </form>
      </Inner>
    </FormContainer>
  );
};

export default InviteMemberForm;