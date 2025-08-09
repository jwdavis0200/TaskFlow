import { useEffect, useRef, useState, useCallback } from 'react';
import styled from '@emotion/styled';
import { AiOutlineClose } from 'react-icons/ai';
import { FiSend } from 'react-icons/fi';
import Modal from './common/Modal';
import LoadingSpinner from './common/LoadingSpinner';
import { TextArea as BaseTextArea } from './common/FormComponents';
import { useStore } from '../store';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  flex: 1;
  height: 100%;
  box-sizing: border-box;
  overflow: hidden;
`;

const HeaderBar = styled.div`
  background: linear-gradient(135deg, var(--brand-gradient-start) 0%, var(--brand-gradient-end) 100%);
  color: #fff;
  padding: 16px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const Title = styled.h3`
  margin: 0;
  color: #fff;
  font-weight: 600;
`;

const CloseButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  color: #fff;
  cursor: pointer;
  border-radius: 50%;
  transition: all 0.2s ease;

  &:hover {
    background: color-mix(in oklab, #ffffff 15%, transparent);
    transform: scale(1.05);
  }

  &:active {
    transform: scale(0.95);
  }
`;

const Body = styled.div`
  padding: 16px 20px 0 20px;
  display: flex;
  flex-direction: column;
  flex: 1;
  gap: 12px;
  min-height: 0; /* ensure children can scroll */
`;

const Messages = styled.div`
  flex: 1;
  min-height: 0; /* allow proper flexbox scrolling */
  overflow-y: auto;
  overflow-x: hidden;
  padding: 16px;
  background: var(--color-surface-elevated-1);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  box-sizing: border-box;

  &::-webkit-scrollbar { width: 6px; }
  &::-webkit-scrollbar-track { background: var(--scrollbar-track); border-radius: 3px; }
  &::-webkit-scrollbar-thumb { background: var(--scrollbar-thumb); border-radius: 3px; }
  &::-webkit-scrollbar-thumb:hover { background: color-mix(in oklab, var(--scrollbar-thumb) 80%, var(--color-text-secondary)); }
`;

const Bubble = styled.div`
  align-self: ${(props) => (props.isOwn ? 'flex-end' : 'flex-start')};
  background: ${(props) => (props.isOwn 
    ? 'linear-gradient(45deg, var(--brand-gradient-start), var(--brand-gradient-end))' 
    : 'color-mix(in oklab, var(--color-surface-elevated-2) 90%, var(--color-text-primary))')};
  color: ${(props) => (props.isOwn ? '#fff' : 'var(--color-text-primary)')};
  padding: 10px 12px;
  border-radius: 14px;
  max-width: 80%;
  white-space: pre-wrap;
  word-wrap: break-word;
  overflow-wrap: anywhere;
  border: ${(props) => (props.isOwn ? 'none' : '1px solid var(--color-border)')};
  box-shadow: 0 2px 10px color-mix(in oklab, var(--color-text-primary) 10%, transparent);
`;

const Meta = styled.div`
  font-size: 11px;
  color: var(--color-text-secondary);
  margin-top: 4px;
`;

const Footer = styled.form`
  display: flex;
  gap: 8px;
  padding: 12px 20px 20px 20px;
  border-top: 1px solid var(--color-border);
  background: var(--color-surface);
  align-items: center;
`;

const Input = styled(BaseTextArea)`
  flex: 1;
  height: 44px; /* initial height equals send button */
  min-height: 44px;
  max-height: 140px;
  resize: vertical;
  margin: 0;
  overflow-y: auto;
`;

const SendButton = styled.button`
  width: 44px;
  height: 44px;
  border: none;
  border-radius: 12px;
  background: linear-gradient(135deg, var(--brand-gradient-start) 0%, var(--brand-gradient-end) 100%);
  color: #fff;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 6px 20px color-mix(in oklab, var(--brand-gradient-start) 35%, transparent);
  transition: transform 0.15s ease, box-shadow 0.2s ease, opacity 0.2s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 10px 28px color-mix(in oklab, var(--brand-gradient-start) 45%, transparent);
  }

  &:active {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
`;

const Empty = styled.div`
  text-align: center;
  color: var(--color-text-secondary);
`;

const ChatModal = ({ isOpen, onClose, boardId, boardName, projectId }) => {
  const { user, chatMessages, chatLoading, loadBoardMessages, sendBoardMessage, projectMembers, loadProjectMembers } = useStore();
  const [message, setMessage] = useState('');
  const listRef = useRef(null);

  useEffect(() => {
    if (isOpen && boardId) {
      loadBoardMessages(boardId);
    }
  }, [isOpen, boardId, loadBoardMessages]);

  useEffect(() => {
    if (isOpen && projectId && (!projectMembers || projectMembers.length === 0)) {
      loadProjectMembers(projectId);
    }
  }, [isOpen, projectId, projectMembers, loadProjectMembers]);

  useEffect(() => {
    // Auto scroll to bottom when messages change
    const el = listRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [chatMessages[boardId]?.length]);

  const handleSend = useCallback(async (e) => {
    e.preventDefault();
    const content = message.trim();
    if (!content) return;
    await sendBoardMessage(boardId, content);
    setMessage('');
  }, [message, boardId, sendBoardMessage]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      // Programmatically submit
      handleSend(e);
    }
  }, [handleSend]);

  const messages = chatMessages[boardId] || [];

  return (
    <Modal isOpen={isOpen} onClose={onClose} wide tall>
      <Container>
        <HeaderBar>
          <Title id="chat-title">Board Chat — {boardName}</Title>
          <CloseButton aria-label="Close chat" onClick={onClose} title="Close">
            <AiOutlineClose />
          </CloseButton>
        </HeaderBar>
        <Body>
          {chatLoading && messages.length === 0 ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
              <LoadingSpinner /> Loading messages...
            </div>
          ) : (
            <Messages ref={listRef}>
              {messages.length === 0 ? (
                <Empty>No messages yet. Start the conversation!</Empty>
              ) : (
                messages.map((m) => {
                  const isOwn = user?.uid && m.memberUserId === user.uid;
                  const member = projectMembers?.find(pm => pm.uid === m.memberUserId);
                  const candidateEmail = m.memberEmail || member?.email;
                  const safeEmail = candidateEmail && candidateEmail !== 'Unknown user' ? candidateEmail : null;
                  const fallbackId = m.memberUserId ? `${m.memberUserId.slice(0, 6)}…` : 'Member';
                  const displayName = isOwn
                    ? 'You'
                    : (m.memberDisplayName || member?.displayName || safeEmail || fallbackId);
                  const ts = m.createdAt instanceof Date ? m.createdAt : (m.createdAt ? new Date(m.createdAt) : null);
                  const when = ts && !isNaN(ts.getTime()) ? ts.toLocaleString() : '';
                  return (
                    <div key={m.id}>
                      <Bubble isOwn={isOwn}>{m.content}</Bubble>
                      <Meta>{displayName} • {when}</Meta>
                    </div>
                  );
                })
              )}
            </Messages>
          )}
        </Body>
        <Footer onSubmit={handleSend}>
          <Input
            aria-label="Type a message"
            value={message}
            placeholder="Type a message"
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <SendButton type="submit" aria-label="Send message" title="Send">
            <FiSend size={18} />
          </SendButton>
        </Footer>
      </Container>
    </Modal>
  );
};

export default ChatModal;


