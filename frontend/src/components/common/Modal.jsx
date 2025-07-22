import React from "react";
import { createPortal } from "react-dom";
import styled from "@emotion/styled";

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
  backdrop-filter: blur(5px);
  padding: 0;
  box-sizing: border-box;
  overflow-y: auto;
  
  @media (max-width: 768px) {
    align-items: center;
    padding: 2vh 0;
  }
`;

const ModalContent = styled.div`
  background: white;
  border-radius: 16px;
  padding: 0;
  max-width: ${props => props.wide ? '800px' : '480px'};
  width: 90%;
  max-height: 85vh;
  overflow-y: auto;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
  animation: modalSlideIn 0.3s ease-out;
  margin: 2vh auto;
  position: relative;

  @keyframes modalSlideIn {
    from {
      opacity: 0;
      transform: translateY(-20px) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  @media (max-width: 768px) {
    max-height: 92vh;
    margin: 4vh 5%;
    width: 90%;
    max-width: none;
    min-width: 0;
    box-sizing: border-box;
  }

  /* Ensure scrolling works properly */
  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb {
    background: #c1c1c1;
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: #a8a8a8;
  }
`;

const Modal = ({ isOpen, onClose, children, closeOnOverlayClick = true, wide = false }) => {
  if (!isOpen) return null;

  const handleOverlayClick = (e) => {
    if (closeOnOverlayClick && e.target === e.currentTarget) {
      onClose();
    }
  };

  const modalContent = (
    <ModalOverlay onClick={handleOverlayClick}>
      <ModalContent wide={wide}>
        {children}
      </ModalContent>
    </ModalOverlay>
  );

  // Use React Portal to render modal at document.body level
  // This escapes any parent container's CSS constraints (like overflow: hidden)
  return createPortal(modalContent, document.body);
};

export default Modal;