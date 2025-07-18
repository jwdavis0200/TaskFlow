import React, { useEffect } from "react";
import styled from "@emotion/styled";
import { useStore } from "../store";

const AuthContainer = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
`;

const AuthCard = styled.div`
  background: white;
  border-radius: 16px;
  overflow: hidden;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
`;

const AuthHeader = styled.div`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 24px 20px;
  text-align: center;
`;

const AuthTitle = styled.h1`
  margin: 0;
  font-size: 28px;
  font-weight: 600;
  margin-bottom: 8px;
`;

const AuthSubtitle = styled.p`
  margin: 0;
  font-size: 16px;
  opacity: 0.9;
`;

const AuthBody = styled.div`
  padding: 32px 24px;
  text-align: center;
`;

const AuthDescription = styled.p`
  color: #666;
  font-size: 16px;
  line-height: 1.5;
  margin-bottom: 24px;
`;

const AuthButton = styled.button`
  width: 100%;
  padding: 16px 24px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  background: linear-gradient(45deg, #667eea, #764ba2);
  color: white;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
  }

  &:active {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
    box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
  }
`;

const LoadingSpinner = styled.div`
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: white;
  animation: spin 1s ease-in-out infinite;
  margin-right: 8px;

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

const LoadingContainer = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
`;

const LoadingCard = styled.div`
  background: white;
  border-radius: 16px;
  padding: 40px;
  text-align: center;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
`;

const LoadingText = styled.p`
  color: #666;
  font-size: 16px;
  margin: 16px 0 0 0;
`;

const AuthGuard = ({ children }) => {
  const { 
    user, 
    isAuthenticated, 
    authLoading, 
    signInAnonymous, 
    initAuth 
  } = useStore();

  useEffect(() => {
    const unsubscribe = initAuth();
    return unsubscribe;
  }, [initAuth]);

  const handleSignIn = async () => {
    try {
      await signInAnonymous();
    } catch (error) {
      console.error('Authentication failed:', error);
    }
  };

  if (authLoading) {
    return (
      <LoadingContainer>
        <LoadingCard>
          <LoadingSpinner />
          <LoadingText>Initializing TaskFlow Pro...</LoadingText>
        </LoadingCard>
      </LoadingContainer>
    );
  }

  if (!isAuthenticated) {
    return (
      <AuthContainer>
        <AuthCard>
          <AuthHeader>
            <AuthTitle>TaskFlow Pro</AuthTitle>
            <AuthSubtitle>Project Management Made Simple</AuthSubtitle>
          </AuthHeader>
          <AuthBody>
            <AuthDescription>
              Welcome to TaskFlow Pro! Get started by signing in to access your projects, 
              boards, and tasks. We'll create a temporary account for you to explore all features.
            </AuthDescription>
            <AuthButton onClick={handleSignIn}>
              Get Started
            </AuthButton>
          </AuthBody>
        </AuthCard>
      </AuthContainer>
    );
  }

  return children;
};

export default AuthGuard;