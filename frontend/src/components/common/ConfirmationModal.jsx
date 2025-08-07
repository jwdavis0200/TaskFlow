import styled from "@emotion/styled";
import { Warning, DeleteOutline, CheckCircle, Info } from '@mui/icons-material';
import LoadingSpinner from "./LoadingSpinner";
import Modal from "./Modal";

const ConfirmationContainer = styled.div`
  background: rgba(255, 255, 255, 0.95);
  border-radius: 16px;
  overflow: hidden;
  width: 100%;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15);
`;

const ConfirmationHeader = styled.div`
  background: ${props => {
    switch(props.modalType) {
      case 'danger':
        return 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
      case 'success':
        return 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
      case 'info':
        return 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)';
      default:
        return 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'; // Default blue-purple gradient
    }
  }};
  color: white;
  padding: 20px 24px;
  text-align: center;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
`;

const ConfirmationTitle = styled.h2`
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  line-height: 1.3;
`;

const ConfirmationBody = styled.div`
  padding: 24px;
`;

const ConfirmationMessage = styled.p`
  margin: 0 0 18px 0;
  color: #374151;
  font-size: 15px;
  line-height: 1.5;
  font-weight: 500;
`;

const WarningText = styled.div`
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #991b1b;
  padding: 12px;
  border-radius: 8px;
  border-left: 4px solid #ef4444;
  line-height: 1.4;
  position: relative;
  display: flex;
  align-items: flex-start;
`;

const WarningIconWrapper = styled.div`
  margin-right: 8px;
  margin-top: 2px;
  color: #991b1b;
`;

const ConfirmationActions = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 8px;
  
  @media (hover: none) and (pointer: coarse), (max-width: 768px) {
    flex-direction: column-reverse;
    gap: 10px;
  }
`;

const Button = styled.button`
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  min-width: 100px;

  &:hover {
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

const CancelButton = styled(Button)`
  background: #f5f5f5;
  color: #666;
  border: 1px solid #ddd;

  &:hover:not(:disabled) {
    background: #eeeeee;
    border-color: #ccc;
  }
`;

const ActionButton = styled(Button)`
  background: ${props => {
    switch(props.modalType) {
      case 'danger':
        return 'linear-gradient(45deg, #ef4444, #dc2626)';
      case 'success':
        return 'linear-gradient(45deg, #10b981, #059669)';
      case 'info':
        return 'linear-gradient(45deg, #3b82f6, #2563eb)';
      default:
        return 'linear-gradient(45deg, #667eea, #764ba2)'; // Default blue-purple gradient
    }
  }};
  color: white;
  box-shadow: ${props => {
    switch(props.modalType) {
      case 'danger':
        return '0 4px 15px rgba(239, 68, 68, 0.3)';
      case 'success':
        return '0 4px 15px rgba(16, 185, 129, 0.3)';
      case 'info':
        return '0 4px 15px rgba(59, 130, 246, 0.3)';
      default:
        return '0 4px 15px rgba(102, 126, 234, 0.3)';
    }
  }};

  &:hover:not(:disabled) {
    box-shadow: ${props => {
      switch(props.modalType) {
        case 'danger':
          return '0 6px 20px rgba(239, 68, 68, 0.4)';
        case 'success':
          return '0 6px 20px rgba(16, 185, 129, 0.4)';
        case 'info':
          return '0 6px 20px rgba(59, 130, 246, 0.4)';
        default:
          return '0 6px 20px rgba(102, 126, 234, 0.4)';
      }
    }};
    transform: translateY(-2px);
    background: ${props => {
      switch(props.modalType) {
        case 'danger':
          return 'linear-gradient(45deg, #dc2626, #b91c1c)';
        case 'success':
          return 'linear-gradient(45deg, #059669, #047857)';
        case 'info':
          return 'linear-gradient(45deg, #2563eb, #1d4ed8)';
        default:
          return 'linear-gradient(45deg, #764ba2, #5a67d8)';
      }
    }};
  }
`;

const ModalIcon = ({ modalType }) => {
  switch(modalType) {
    case 'danger':
      return <DeleteOutline fontSize="medium" />;
    case 'success':
      return <CheckCircle fontSize="medium" />;
    case 'info':
      return <Info fontSize="medium" />;
    default:
      return null;
  }
};

const ConfirmationModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = "Confirm Action",
  message,
  warningText,
  confirmText = "Confirm",
  cancelText = "Cancel",
  isLoading = false,
  modalType = "default", // default, danger, success, info
}) => {
  const handleConfirm = async () => {
    await onConfirm();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} closeOnOverlayClick={!isLoading}>
      <ConfirmationContainer>
        <ConfirmationHeader modalType={modalType}>
          <ConfirmationTitle>
            <ModalIcon modalType={modalType} />
            {title}
          </ConfirmationTitle>
        </ConfirmationHeader>

        <ConfirmationBody>
          <ConfirmationMessage>
            {message}
          </ConfirmationMessage>
          
          {warningText && (
            <WarningText>
              <WarningIconWrapper>
                <Warning fontSize="small" />
              </WarningIconWrapper>
              {warningText}
            </WarningText>
          )}

          <ConfirmationActions>
            <CancelButton 
              type="button" 
              onClick={onClose} 
              disabled={isLoading}
            >
              {cancelText}
            </CancelButton>
            <ActionButton 
              type="button" 
              onClick={handleConfirm} 
              disabled={isLoading}
              modalType={confirmButtonStyle || modalType}
            >
              {isLoading && <LoadingSpinner />}
              {confirmText}
            </ActionButton>
          </ConfirmationActions>
        </ConfirmationBody>
      </ConfirmationContainer>
    </Modal>
  );
};

export default ConfirmationModal;