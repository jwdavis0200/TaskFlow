import { useState } from 'react';
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
  color: white;
  
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
              padding: '12px 16px',
              border: '2px solid #e0e0e0',
              borderRadius: '8px',
              fontSize: '14px',
              background: 'white',
              boxSizing: 'border-box'
            }}
          >
            <option value="viewer">Viewer (Read-only)</option>
            <option value="editor">Editor (Can edit)</option>
            <option value="admin">Admin (Full access)</option>
          </select>
        </FormGroup>
        
        {error && <ErrorMessage>{error}</ErrorMessage>}
        
        <FormActions>
          <Button type="submit" disabled={loading} style={{
            background: '#007bff',
            color: 'white'
          }}>
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