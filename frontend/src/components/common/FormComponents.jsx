import styled from "@emotion/styled";

export const FormContainer = styled.div`
  background: white;
  border-radius: 16px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  height: 100%;

  @media (max-width: 768px) {
    max-height: 100%;
  }
`;

export const FormHeader = styled.div`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 16px 20px;
  text-align: center;
`;

export const FormTitle = styled.h2`
  margin: 0;
  font-size: 24px;
  font-weight: 600;
`;

export const FormBody = styled.form`
  padding: 20px;
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;

  @media (max-width: 768px) {
    padding: 16px;
  }
`;

export const FormGroup = styled.div`
  margin-bottom: 16px;
`;

export const FormContent = styled.div`
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  width: 100%;
  box-sizing: border-box;
  padding-right: 4px;

  @media (max-width: 768px) {
    padding-right: 0;
  }
`;

export const Label = styled.label`
  display: block;
  margin-bottom: 8px;
  color: #333;
  font-weight: 500;
  font-size: 14px;
`;

export const Input = styled.input`
  width: 100%;
  padding: 12px 16px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
  transition: all 0.3s ease;
  box-sizing: border-box;

  &:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  }

  &:hover {
    border-color: #ccc;
  }

  &.error {
    border-color: #ff4757;
    box-shadow: 0 0 0 3px rgba(255, 71, 87, 0.1);
  }
`;

export const TextArea = styled.textarea`
  width: 100%;
  padding: 12px 16px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
  min-height: 80px;
  resize: vertical;
  font-family: inherit;
  transition: all 0.3s ease;
  box-sizing: border-box;

  &:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  }

  &:hover {
    border-color: #ccc;
  }

  &.error {
    border-color: #ff4757;
    box-shadow: 0 0 0 3px rgba(255, 71, 87, 0.1);
  }
`;

export const Select = styled.select`
  width: 100%;
  padding: 12px 16px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
  background: white;
  transition: all 0.3s ease;
  box-sizing: border-box;

  &:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  }

  &:hover {
    border-color: #ccc;
  }

  &.error {
    border-color: #ff4757;
    box-shadow: 0 0 0 3px rgba(255, 71, 87, 0.1);
  }
`;

export const FormActions = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  padding: 16px 20px;
  border-top: 1px solid #eee;
  background: white;
  margin-top: auto;

  @media (max-width: 768px) {
    padding: 16px;
    flex-direction: column-reverse;
    gap: 8px;
  }
`;

export const Button = styled.button`
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  min-width: 100px;

  @media (max-width: 768px) {
    padding: 16px 24px;
    font-size: 16px;
    min-width: auto;
    width: 100%;
  }

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

export const PrimaryButton = styled(Button)`
  background: linear-gradient(45deg, #667eea, #764ba2);
  color: white;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);

  &:hover:not(:disabled) {
    box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
  }
`;

export const SecondaryButton = styled(Button)`
  background: #f5f5f5;
  color: #666;
  border: 1px solid #ddd;

  &:hover:not(:disabled) {
    background: #eeeeee;
    border-color: #ccc;
  }
`;

export const ErrorMessage = styled.div`
  color: #ff4757;
  font-size: 12px;
  margin-top: 4px;
  margin-bottom: 8px;
`;

export const SuccessMessage = styled.div`
  color: #2ed573;
  font-size: 12px;
  margin-top: 4px;
  margin-bottom: 8px;
`;

