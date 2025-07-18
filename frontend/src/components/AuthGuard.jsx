import React, { useEffect, useState } from "react";
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

const AuthInput = styled.input`
  width: 100%;
  padding: 12px 16px;
  border: 2px solid #e1e5e9;
  border-radius: 8px;
  font-size: 16px;
  margin-bottom: 16px;
  transition: border-color 0.3s ease;

  &:focus {
    outline: none;
    border-color: #667eea;
  }

  &::placeholder {
    color: #999;
  }
`;

const AuthForm = styled.form`
  width: 100%;
`;

const AuthLink = styled.button`
  background: none;
  border: none;
  color: #667eea;
  cursor: pointer;
  text-decoration: underline;
  font-size: 14px;
  margin-top: 16px;

  &:hover {
    color: #764ba2;
  }
`;

const ErrorMessage = styled.div`
  color: #e74c3c;
  font-size: 14px;
  margin-bottom: 16px;
  text-align: center;
`;

const AuthGuard = ({ children }) => {
  const { 
    user, 
    isAuthenticated, 
    authLoading, 
    signInUser,
    signUpUser,
    initAuth 
  } = useStore();

  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const unsubscribe = initAuth();
    return unsubscribe;
  }, [initAuth]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!isLogin) {
        // Registration
        if (password !== confirmPassword) {
          setError('Passwords do not match');
          setLoading(false);
          return;
        }
        if (password.length < 6) {
          setError('Password must be at least 6 characters');
          setLoading(false);
          return;
        }
        await signUpUser(email, password);
      } else {
        // Login
        await signInUser(email, password);
      }
    } catch (error) {
      console.error('Authentication failed:', error);
      setError(error.message || 'Authentication failed');
    }
    setLoading(false);
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
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
              {isLogin 
                ? "Welcome back! Sign in to access your projects and tasks."
                : "Create your account to start managing your projects efficiently."
              }
            </AuthDescription>
            
            {error && <ErrorMessage>{error}</ErrorMessage>}
            
            <AuthForm onSubmit={handleSubmit}>
              <AuthInput
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <AuthInput
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              {!isLogin && (
                <AuthInput
                  type="password"
                  placeholder="Confirm password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              )}
              <AuthButton type="submit" disabled={loading}>
                {loading && <LoadingSpinner />}
                {loading 
                  ? (isLogin ? 'Signing In...' : 'Creating Account...') 
                  : (isLogin ? 'Sign In' : 'Create Account')
                }
              </AuthButton>
            </AuthForm>
            
            <AuthLink onClick={toggleMode}>
              {isLogin 
                ? "Don't have an account? Create one" 
                : "Already have an account? Sign in"
              }
            </AuthLink>
          </AuthBody>
        </AuthCard>
      </AuthContainer>
    );
  }

  return children;
};

export default AuthGuard;