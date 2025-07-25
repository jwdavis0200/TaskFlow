import React from "react";
import styled from "@emotion/styled";
import LoadingSpinner from "./LoadingSpinner";
import Modal from "./Modal";

const ConfirmationContainer = styled.div`
  background: white;
  border-radius: 16px;
  overflow: hidden;
  width: 100%;
`;

const ConfirmationHeader = styled.div`
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  color: white;
  padding: 20px 24px;
  text-align: center;
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
  margin: 0 0 24px 0;
  color: #dc2626;
  font-size: 13px;
  font-weight: 500;
  background: #fef2f2;
  padding: 14px 16px;
  border-radius: 8px;
  border-left: 4px solid #ef4444;
  line-height: 1.4;
  position: relative;
  
  &:before {
    content: "⚠️";
    margin-right: 8px;
    font-size: 14px;
  }
`;

const ConfirmationActions = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 8px;
  
  @media (max-width: 768px) {
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

const DeleteButton = styled(Button)`
  background: linear-gradient(45deg, #ef4444, #dc2626);
  color: white;
  box-shadow: 0 4px 15px rgba(239, 68, 68, 0.3);

  &:hover:not(:disabled) {
    box-shadow: 0 6px 20px rgba(239, 68, 68, 0.4);
    background: linear-gradient(45deg, #dc2626, #b91c1c);
  }
`;



const ConfirmationModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = "Confirm Delete",
  message,
  warningText,
  confirmText = "Delete",
  cancelText = "Cancel",
  isLoading = false
}) => {
  const handleConfirm = async () => {
    await onConfirm();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} closeOnOverlayClick={!isLoading}>
      <ConfirmationContainer>
        <ConfirmationHeader>
          <ConfirmationTitle>
            {title}
          </ConfirmationTitle>
        </ConfirmationHeader>

        <ConfirmationBody>
          <ConfirmationMessage>
            {message}
          </ConfirmationMessage>
          
          {warningText && (
            <WarningText>
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
            <DeleteButton 
              type="button" 
              onClick={handleConfirm} 
              disabled={isLoading}
            >
              {isLoading && <LoadingSpinner />}
              {confirmText}
            </DeleteButton>
          </ConfirmationActions>
        </ConfirmationBody>
      </ConfirmationContainer>
    </Modal>
  );
};

export default ConfirmationModal;