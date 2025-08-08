import styled from '@emotion/styled';
import { AiOutlineCheck, AiOutlineClose, AiOutlineWarning, AiOutlineInfoCircle } from 'react-icons/ai';
import { TOAST_CONFIG } from './config';

const ToastContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  min-width: ${TOAST_CONFIG.dimensions.desktop.minWidth};
  max-width: ${TOAST_CONFIG.dimensions.desktop.maxWidth};
  background: var(--color-surface-elevated-1);
  color: var(--color-text-primary);
  border-radius: 12px;
  border: 1px solid ${({ severity }) => {
    switch(severity) {
      case 'success': return 'var(--color-success-text)';
      case 'error': return 'var(--color-danger-text)';
      case 'warning': return 'var(--color-warning-text)';
      default: return 'var(--color-primary)';
    }
  }};
  box-shadow: 0 8px 32px color-mix(in oklab, var(--color-text-primary) 20%, transparent);
  backdrop-filter: blur(10px);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Open Sans', 'Helvetica Neue', sans-serif;
  transition: all 0.3s ease;
  transform: ${({ visible }) => visible ? 'translateY(0)' : 'translateY(100px)'};
  opacity: ${({ visible }) => visible ? 1 : 0};

  @media (max-width: 768px) {
    min-width: ${TOAST_CONFIG.dimensions.mobile.minWidth};
    max-width: ${TOAST_CONFIG.dimensions.mobile.maxWidth};
    padding: 10px 14px;
    gap: 8px;
  }

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 40px color-mix(in oklab, var(--color-text-primary) 30%, transparent);
  }
`;

const IconContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: ${({ severity }) => {
    switch(severity) {
      case 'success': return 'var(--color-success-text)';
      case 'error': return 'var(--color-danger-text)';
      case 'warning': return 'var(--color-warning-text)';
      default: return 'var(--color-primary)';
    }
  }};
  color: white;
  flex-shrink: 0;
  margin-top: 2px;

  svg {
    width: 14px;
    height: 14px;
  }
`;

const Content = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const Message = styled.div`
  font-size: 14px;
  font-weight: 500;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: ${TOAST_CONFIG.dimensions.desktop.maxLines};
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-word;

  @media (max-width: 768px) {
    -webkit-line-clamp: ${TOAST_CONFIG.dimensions.mobile.maxLines};
    font-size: 13px;
  }
`;

const CloseButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 2px;
  transition: all 0.2s ease;

  &:hover {
    background: color-mix(in oklab, var(--color-text-primary) 10%, transparent);
    color: var(--color-text-primary);
    transform: scale(1.1);
  }

  &:active {
    transform: scale(0.95);
  }

  svg {
    width: 12px;
    height: 12px;
  }
`;

const getIcon = (severity) => {
  switch (severity) {
    case 'success':
      return <AiOutlineCheck />;
    case 'error':
      return <AiOutlineClose />;
    case 'warning':
      return <AiOutlineWarning />;
    case 'info':
    default:
      return <AiOutlineInfoCircle />;
  }
};

const NotificationToast = ({ toast, message, severity = 'info', onDismiss }) => {
  const handleClose = () => {
    if (onDismiss) {
      onDismiss();
    }
  };

  return (
    <ToastContainer 
      className={TOAST_CONFIG.className}
      severity={severity}
      visible={toast.visible}
    >
      <IconContainer severity={severity}>
        {getIcon(severity)}
      </IconContainer>
      
      <Content>
        <Message>{message}</Message>
      </Content>
      
      <CloseButton onClick={handleClose} aria-label="Close notification">
        <AiOutlineClose />
      </CloseButton>
    </ToastContainer>
  );
};

export default NotificationToast;