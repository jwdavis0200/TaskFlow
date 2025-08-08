import styled from "@emotion/styled";

export const FormContainer = styled.div`
  background: var(--color-surface);
  border-radius: 16px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  height: 100%;

  @media (hover: none) and (pointer: coarse), (max-width: 768px) {
    max-height: 100%;
  }
`;

export const FormHeader = styled.div`
  background: linear-gradient(135deg, var(--brand-gradient-start) 0%, var(--brand-gradient-end) 100%);
  color: #fff;
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

  @media (hover: none) and (pointer: coarse), (max-width: 768px) {
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
`;

export const Label = styled.label`
  display: block;
  margin-bottom: 8px;
  color: var(--color-text-primary);
  font-weight: 500;
  font-size: 14px;
`;

export const Input = styled.input`
  width: 100%;
  padding: 12px 16px;
  border: 2px solid var(--color-border);
  border-radius: 8px;
  font-size: 14px;
  transition: all 0.3s ease;
  box-sizing: border-box;

  &:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 3px color-mix(in oklab, var(--color-primary) 20%, transparent);
  }

  &:hover {
    border-color: color-mix(in oklab, var(--color-border) 60%, var(--color-text-secondary));
  }

  &.error {
    border-color: var(--color-danger-text);
    box-shadow: 0 0 0 3px color-mix(in oklab, var(--color-danger-text) 20%, transparent);
  }
`;

export const TextArea = styled.textarea`
  width: 100%;
  padding: 12px 16px;
  border: 2px solid var(--color-border);
  border-radius: 8px;
  font-size: 14px;
  min-height: 80px;
  resize: vertical;
  font-family: inherit;
  transition: all 0.3s ease;
  box-sizing: border-box;

  &:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 3px color-mix(in oklab, var(--color-primary) 20%, transparent);
  }

  &:hover {
    border-color: color-mix(in oklab, var(--color-border) 60%, var(--color-text-secondary));
  }

  &.error {
    border-color: var(--color-danger-text);
    box-shadow: 0 0 0 3px color-mix(in oklab, var(--color-danger-text) 20%, transparent);
  }
`;

export const Select = styled.select`
  width: 100%;
  padding: 12px 16px;
  border: 2px solid var(--color-border);
  border-radius: 8px;
  font-size: 14px;
  background: var(--color-surface);
  transition: all 0.3s ease;
  box-sizing: border-box;

  &:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 3px color-mix(in oklab, var(--color-primary) 20%, transparent);
  }

  &:hover {
    border-color: color-mix(in oklab, var(--color-border) 60%, var(--color-text-secondary));
  }

  &.error {
    border-color: var(--color-danger-text);
    box-shadow: 0 0 0 3px color-mix(in oklab, var(--color-danger-text) 20%, transparent);
  }
`;

export const FormActions = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  padding: 16px 20px;
  border-top: 1px solid var(--color-border);
  background: var(--color-surface);
  margin-top: auto;

  @media (hover: none) and (pointer: coarse), (max-width: 768px) {
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

  @media (hover: none) and (pointer: coarse), (max-width: 768px) {
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
  background: linear-gradient(45deg, var(--brand-gradient-start), var(--brand-gradient-end));
  color: #fff;
  box-shadow: 0 4px 15px color-mix(in oklab, var(--color-primary) 30%, transparent);

  &:hover:not(:disabled) {
    box-shadow: 0 6px 20px color-mix(in oklab, var(--brand-gradient-start) 40%, transparent);
  }
`;

export const SecondaryButton = styled(Button)`
  background: color-mix(in oklab, var(--color-surface) 80%, var(--color-text-secondary));
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border);

  &:hover:not(:disabled) {
    background: color-mix(in oklab, var(--color-surface) 70%, var(--color-text-secondary));
    border-color: color-mix(in oklab, var(--color-border) 80%, var(--color-text-secondary));
  }
`;

export const ErrorMessage = styled.div`
  color: var(--color-danger-text);
  font-size: 12px;
  margin-top: 4px;
  margin-bottom: 8px;
`;

export const SuccessMessage = styled.div`
  color: var(--color-success-text);
  font-size: 12px;
  margin-top: 4px;
  margin-bottom: 8px;
`;

