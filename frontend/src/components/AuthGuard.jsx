import { useEffect, useState } from "react";
import styled from "@emotion/styled";
import { Check, Close } from '@mui/icons-material';
import { useStore } from "../store";
import LoadingSpinner from "./common/LoadingSpinner";
import PasswordResetRequest from "./PasswordResetRequest";

const AuthContainer = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--app-background);
  padding: 16px;
  box-sizing: border-box;
  
  @media (max-width: 480px) {
    padding: 16px 8px;
    /* Keep vertical centering but add some top margin for better mobile UX */
    align-items: center;
    min-height: 100vh;
    min-height: 100dvh; /* Use dynamic viewport height for better mobile support */
  }
  
  @media (max-width: 480px) and (max-height: 600px) {
    /* For very short mobile screens, adjust to prevent overflow */
    align-items: flex-start;
    padding-top: 20px;
  }
`;

const AuthCard = styled.div`
  background: var(--color-surface);
  border-radius: 16px;
  overflow: hidden;
  width: 100%;
  max-width: 400px;
  max-height: 90vh;
  box-shadow: 0 20px 40px var(--color-overlay);
  position: relative;
  box-sizing: border-box;
  
  @media (max-width: 480px) {
    max-width: calc(100vw - 32px);
    border-radius: 12px;
    max-height: 95vh;
    /* Remove explicit margins - let flexbox center the card */
  }
  
  @media (max-height: 600px) {
    max-height: 85vh;
    overflow-y: auto;
  }
`;

const AuthHeader = styled.div`
  background: linear-gradient(135deg, var(--brand-gradient-start) 0%, var(--brand-gradient-end) 100%);
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
  padding: 24px 20px 32px 20px;
  text-align: center;
  
  @media (max-width: 480px) {
    padding: 20px 16px 24px 16px;
  }
  
  @media (max-height: 600px) {
    padding: 16px 20px 20px 20px;
  }
`;

const AuthDescription = styled.p`
  color: var(--color-text-secondary);
  font-size: 16px;
  line-height: 1.5;
  margin-bottom: 20px;
  
  @media (max-width: 480px) {
    font-size: 14px;
    margin-bottom: 16px;
  }
  
  @media (max-height: 600px) {
    margin-bottom: 12px;
  }
`;

const AuthButton = styled.button`
  width: 100%;
  padding: 16px 24px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s ease;
  background: linear-gradient(45deg, var(--brand-gradient-start), var(--brand-gradient-end));
  color: white;
  box-shadow: 0 4px 15px color-mix(in srgb, var(--color-primary) 30%, transparent);
  box-sizing: border-box;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 6px 20px color-mix(in srgb, var(--color-primary) 40%, transparent);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }

  &:focus {
    outline: none;
    box-shadow: 0 4px 15px color-mix(in srgb, var(--color-primary) 30%, transparent), 0 0 0 3px color-mix(in srgb, var(--color-primary) 20%, transparent);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }

  @media (max-width: 480px) {
    padding: 14px 20px;
    font-size: 16px;
  }
`;



const LoadingContainer = styled.div`
  min-height: 100vh;
  width: 100vw;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--app-background);
  position: fixed;
  top: 0;
  left: 0;
  z-index: 9999;
  padding: 20px;
  box-sizing: border-box;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: radial-gradient(circle at 30% 20%, color-mix(in srgb, var(--color-surface) 10%, transparent) 0%, transparent 50%),
                radial-gradient(circle at 70% 80%, color-mix(in srgb, var(--color-surface) 8%, transparent) 0%, transparent 50%);
    pointer-events: none;
  }
`;

const LoadingCard = styled.div`
  background: color-mix(in srgb, var(--color-surface) 95%, transparent);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid color-mix(in srgb, var(--color-border) 20%, transparent);
  border-radius: 24px;
  padding: 48px 40px;
  text-align: center;
  box-shadow: 
    0 25px 50px color-mix(in srgb, var(--color-overlay) 15%, transparent),
    0 12px 24px color-mix(in srgb, var(--color-overlay) 10%, transparent),
    inset 0 1px 0 color-mix(in srgb, var(--color-surface) 60%, transparent);
  position: relative;
  z-index: 10;
  max-width: 400px;
  width: 100%;
  animation: fadeInUp 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards;
  transform: translateY(20px);
  opacity: 0;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(135deg, 
      color-mix(in srgb, var(--color-primary) 5%, transparent) 0%, 
      color-mix(in srgb, var(--color-primary) 2%, transparent) 100%);
    border-radius: 24px;
    pointer-events: none;
  }
  
  @keyframes fadeInUp {
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  @media (max-width: 480px) {
    padding: 36px 24px;
    margin: 0 16px;
    border-radius: 20px;
  }
`;

const LoadingText = styled.p`
  color: var(--color-text-primary);
  font-size: 18px;
  font-weight: 500;
  margin: 0;
  line-height: 1.5;
  position: relative;
  z-index: 1;
  
  &::after {
    content: '';
    animation: dots 1.5s infinite;
  }
  
  @keyframes dots {
    0%, 20% {
      content: '';
    }
    40% {
      content: '.';
    }
    60% {
      content: '..';
    }
    80%, 100% {
      content: '...';
    }
  }
  
  @media (max-width: 480px) {
    font-size: 16px;
  }
`;

const AuthInput = styled.input`
  width: 100%;
  padding: 14px 16px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  font-size: 16px;
  font-family: inherit;
  margin-bottom: 16px;
  transition: all 0.2s ease;
  box-sizing: border-box;
  background: var(--color-surface);
  color: var(--color-text-primary);

  &:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 10%, transparent);
  }

  &:hover {
    border-color: color-mix(in srgb, var(--color-border) 80%, var(--color-text-secondary));
  }

  &::placeholder {
    color: var(--color-text-secondary);
    font-weight: 400;
  }

  @media (max-width: 480px) {
    font-size: 16px; /* Prevent zoom on iOS */
    padding: 12px 14px;
  }
`;

const AuthForm = styled.form`
  width: 100%;
  box-sizing: border-box;
`;

const AuthLink = styled.button`
  background: none;
  border: none;
  color: var(--color-primary);
  cursor: pointer;
  text-decoration: underline;
  font-size: 14px;
  margin-top: 16px;

  &:hover {
    color: var(--color-primary-hover);
  }
`;

const ErrorMessage = styled.div`
  color: var(--color-danger-text);
  font-size: 14px;
  margin-bottom: 16px;
  text-align: center;
`;

const ValidationIndicator = styled.div`
  font-size: 12px;
  margin-top: -12px;
  margin-bottom: 12px;
  padding: 0 4px;
  display: flex;
  align-items: center;
  gap: 6px;
  box-sizing: border-box;
  
  &.valid {
    color: var(--color-success-text);
  }
  
  &.invalid {
    color: var(--color-danger-text);
  }
  
  &.neutral {
    color: var(--color-text-secondary);
  }
`;

const ValidationIcon = styled.span`
  font-size: 10px;
  font-weight: bold;
`;

const PasswordRequirements = styled.div`
  background: var(--color-surface-elevated-2);
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 16px;
  border-left: 3px solid var(--color-primary);
  box-sizing: border-box;
  
  @media (max-width: 480px) {
    padding: 10px 14px;
    margin-bottom: 12px;
  }
`;

const RequirementItem = styled.div`
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
  box-sizing: border-box;
  
  &:last-child {
    margin-bottom: 0;
  }
  
  &.met {
    color: var(--color-success-text);
  }
  
  &.unmet {
    color: var(--color-danger-text);
  }
  
  @media (max-width: 480px) {
    font-size: 11px;
    gap: 6px;
    margin-bottom: 4px;
  }
`;

const AuthGuard = ({ children }) => {
  const { 
    isAuthenticated, 
    authLoading, 
    signInUser,
    signUpUser,
    initAuth 
  } = useStore();

  const [isLogin, setIsLogin] = useState(true);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Password validation states
  const [passwordValidation, setPasswordValidation] = useState({
    hasMinLength: false,
    hasSpecialChar: false,
    passwordsMatch: true
  });

  useEffect(() => {
    const unsubscribe = initAuth();
    return unsubscribe;
  }, [initAuth]);

  // Validate password requirements
  const validatePassword = (pwd, confirmPwd = confirmPassword) => {
    const hasMinLength = pwd.length >= 6;
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(pwd);
    const passwordsMatch = pwd === confirmPwd;
    
    setPasswordValidation({
      hasMinLength,
      hasSpecialChar,
      passwordsMatch
    });
    
    return { hasMinLength, hasSpecialChar, passwordsMatch };
  };

  // Handle password input change
  const handlePasswordChange = (e) => {
    const newPassword = e.target.value;
    setPassword(newPassword);
    if (!isLogin) {
      validatePassword(newPassword);
    }
  };

  // Handle confirm password input change
  const handleConfirmPasswordChange = (e) => {
    const newConfirmPassword = e.target.value;
    setConfirmPassword(newConfirmPassword);
    if (!isLogin) {
      validatePassword(password, newConfirmPassword);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!isLogin) {
        // Registration - validate with enhanced requirements
        const validation = validatePassword(password, confirmPassword);
        
        if (!validation.passwordsMatch) {
          setError('Passwords do not match');
          setLoading(false);
          return;
        }
        if (!validation.hasMinLength) {
          setError('Password must be at least 6 characters');
          setLoading(false);
          return;
        }
        if (!validation.hasSpecialChar) {
          setError('Password must contain at least one special character');
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
    setShowPasswordReset(false);
    setPasswordValidation({
      hasMinLength: false,
      hasSpecialChar: false,
      passwordsMatch: true
    });
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
    // Show password reset form
    if (showPasswordReset) {
      return (
        <AuthContainer>
          <AuthCard>
            <AuthHeader>
              <AuthTitle>TaskFlow Pro</AuthTitle>
              <AuthSubtitle>Password Reset</AuthSubtitle>
            </AuthHeader>
            <AuthBody>
              <PasswordResetRequest onBack={() => setShowPasswordReset(false)} />
            </AuthBody>
          </AuthCard>
        </AuthContainer>
      );
    }

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
                onChange={handlePasswordChange}
                required
              />
              {!isLogin && password && (
                <PasswordRequirements>
                  <RequirementItem className={passwordValidation.hasMinLength ? 'met' : 'unmet'}>
                    <ValidationIcon>{passwordValidation.hasMinLength ? <Check /> : <Close />}</ValidationIcon>
                    At least 6 characters
                  </RequirementItem>
                  <RequirementItem className={passwordValidation.hasSpecialChar ? 'met' : 'unmet'}>
                    <ValidationIcon>{passwordValidation.hasSpecialChar ? <Check /> : <Close />}</ValidationIcon>
                    Contains special character (!@#$%^&*(),.?":{}|&lt;&gt;)
                  </RequirementItem>
                </PasswordRequirements>
              )}
              {!isLogin && (
                <>
                  <AuthInput
                    type="password"
                    placeholder="Confirm password"
                    value={confirmPassword}
                    onChange={handleConfirmPasswordChange}
                    required
                  />
                  {confirmPassword && (
                    <ValidationIndicator className={passwordValidation.passwordsMatch ? 'valid' : 'invalid'}>
                      <ValidationIcon>{passwordValidation.passwordsMatch ? <Check /> : <Close />}</ValidationIcon>
                      {passwordValidation.passwordsMatch ? 'Passwords match' : 'Passwords do not match'}
                    </ValidationIndicator>
                  )}
                </>
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
            
            {isLogin && (
              <AuthLink onClick={() => setShowPasswordReset(true)}>
                Forgot your password?
              </AuthLink>
            )}
          </AuthBody>
        </AuthCard>
      </AuthContainer>
    );
  }

  return children;
};

export default AuthGuard;