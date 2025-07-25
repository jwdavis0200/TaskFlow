import React, { useState } from 'react';
import styled from '@emotion/styled';
import { sendPasswordReset } from '../firebase/auth';
import LoadingSpinner from './common/LoadingSpinner';

const ResetContainer = styled.div`
  max-width: 400px;
  margin: 0 auto;
  padding: 24px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
`;

const ResetTitle = styled.h2`
  color: #333;
  margin-bottom: 8px;
  text-align: center;
`;

const ResetDescription = styled.p`
  color: #666;
  margin-bottom: 24px;
  text-align: center;
  line-height: 1.5;
`;

const ResetForm = styled.form`
  width: 100%;
`;

const ResetInput = styled.input`
  width: 100%;
  padding: 14px 16px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 16px;
  margin-bottom: 16px;
  box-sizing: border-box;
  
  &:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  }
`;

const ResetButton = styled.button`
  width: 100%;
  padding: 16px;
  background: linear-gradient(45deg, #667eea, #764ba2);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  
  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

const Message = styled.div`
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 16px;
  font-size: 14px;
  
  &.success {
    background: #d4edda;
    color: #155724;
    border: 1px solid #c3e6cb;
  }
  
  &.error {
    background: #f8d7da;
    color: #721c24;
    border: 1px solid #f5c6cb;
  }
`;

const BackLink = styled.button`
  background: none;
  border: none;
  color: #667eea;
  cursor: pointer;
  text-decoration: underline;
  font-size: 14px;
  margin-top: 16px;
  display: block;
  margin-left: auto;
  margin-right: auto;
  
  &:hover {
    color: #764ba2;
  }
`;

const PasswordResetRequest = ({ onBack }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    const result = await sendPasswordReset(email);
    
    if (result.success) {
      setMessage('If an account with that email exists, a password reset email has been sent. Please check your inbox.');
      setMessageType('success');
      setEmail(''); // Clear form on success
    } else {
      setMessage(result.error);
      setMessageType('error');
    }
    
    setLoading(false);
  };

  return (
    <ResetContainer>
      <ResetTitle>Reset Password</ResetTitle>
      <ResetDescription>
        Enter your email address and we'll send you a link to reset your password.
      </ResetDescription>
      
      {message && (
        <Message className={messageType}>
          {message}
        </Message>
      )}
      
      <ResetForm onSubmit={handleSubmit}>
        <ResetInput
          type="email"
          placeholder="Enter your email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={loading}
        />
        
        <ResetButton type="submit" disabled={loading || !email.trim()}>
          {loading && <LoadingSpinner />}
          {loading ? 'Sending...' : 'Send Reset Link'}
        </ResetButton>
      </ResetForm>
      
      <BackLink onClick={onBack}>
        Back to Sign In
      </BackLink>
    </ResetContainer>
  );
};

export default PasswordResetRequest;