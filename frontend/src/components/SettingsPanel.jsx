import { useCallback } from 'react';
import styled from '@emotion/styled';
import { useStore } from '../store';
import {
  FormContainer,
  FormHeader,
  FormTitle,
  FormBody,
  FormGroup,
} from './common/FormComponents';

const SectionTitle = styled.div`
  font-weight: 600;
  font-size: 14px;
  color: var(--color-text-primary);
  margin-bottom: 8px;
`;

const OptionRow = styled.label`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  cursor: pointer;
  margin-bottom: 10px;
  background: var(--color-surface);
  transition: background 0.2s ease, border-color 0.2s ease;

  &:hover {
    background: color-mix(in oklab, var(--color-surface) 90%, var(--color-text-secondary));
    border-color: color-mix(in oklab, var(--color-border) 80%, var(--color-text-secondary));
  }
`;

const Hint = styled.div`
  font-size: 12px;
  color: var(--color-text-secondary);
  margin-top: 6px;
`;

const Actions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 16px;
`;

const Button = styled.button`
  padding: 10px 14px;
  border-radius: 8px;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text-primary);
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease;

  &:hover {
    background: color-mix(in oklab, var(--color-surface) 90%, var(--color-text-secondary));
    border-color: color-mix(in oklab, var(--color-border) 80%, var(--color-text-secondary));
  }
`;

const SettingsPanel = ({ onClose }) => {
  const themePreference = useStore((state) => state.themePreference);
  const setThemePreference = useStore((state) => state.setThemePreference);

  const onChange = useCallback((value) => {
    setThemePreference(value);
  }, [setThemePreference]);

  return (
    <FormContainer>
      <FormHeader>
        <FormTitle>Settings</FormTitle>
      </FormHeader>
      <FormBody onSubmit={(e) => e.preventDefault()}>
        <FormGroup>
          <SectionTitle>Appearance</SectionTitle>
          <OptionRow>
            <input
              type="radio"
              name="themeChoice"
              value="light"
              checked={themePreference === 'light'}
              onChange={() => onChange('light')}
            />
            <div>Light</div>
          </OptionRow>
          <OptionRow>
            <input
              type="radio"
              name="themeChoice"
              value="dark"
              checked={themePreference === 'dark'}
              onChange={() => onChange('dark')}
            />
            <div>Dark</div>
          </OptionRow>
          <OptionRow>
            <input
              type="radio"
              name="themeChoice"
              value="system"
              checked={themePreference === 'system'}
              onChange={() => onChange('system')}
            />
            <div>System</div>
          </OptionRow>
        </FormGroup>

        <Actions>
          <Button type="button" onClick={onClose}>Close</Button>
        </Actions>
      </FormBody>
    </FormContainer>
  );
};

export default SettingsPanel;


