import { useEffect, useRef, useState } from 'react';
import styled from '@emotion/styled';
import Modal from './common/Modal';
import LoadingSpinner from './common/LoadingSpinner';
import { useStore } from '../store';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  flex: 1;
  height: 100%;
  box-sizing: border-box;
  padding: 16px;
  gap: 12px;
  overflow: hidden;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
`;

const Title = styled.h3`
  margin: 0;
  color: var(--color-text-primary);
`;

const Messages = styled.div`
  flex: 1;
  min-height: 0; /* allow proper flexbox scrolling */
  overflow-y: auto;
  overflow-x: hidden;
  padding: 12px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  box-sizing: border-box;
`;

const Bubble = styled.div`
  align-self: ${(props) => (props.isOwn ? 'flex-end' : 'flex-start')};
  background: ${(props) => (props.isOwn ? 'var(--color-primary)' : 'color-mix(in oklab, var(--color-surface-elevated-2) 85%, var(--color-text-primary))')};
  color: ${(props) => (props.isOwn ? '#fff' : 'var(--color-text-primary)')};
  padding: 10px 12px;
  border-radius: 12px;
  max-width: 80%;
  white-space: pre-wrap;
  word-wrap: break-word;
  overflow-wrap: anywhere;
  border: 1px solid var(--color-border);
`;

const Meta = styled.div`
  font-size: 11px;
  opacity: 0.75;
  margin-top: 4px;
`;

const InputRow = styled.form`
  display: flex;
  gap: 8px;
  margin-top: 0;
  padding-top: 12px;
  border-top: 1px solid var(--color-border);
  background: var(--color-surface);
`;

const Input = styled.textarea`
  flex: 1;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid var(--color-border);
  background: var(--color-surface-elevated-2);
  color: var(--color-text-primary);
  min-height: 44px;
  max-height: 120px;
  resize: vertical;
`;

const Send = styled.button`
  padding: 10px 16px;
  border-radius: 8px;
  border: none;
  background: var(--brand-gradient-start);
  color: white;
  cursor: pointer;
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

  const handleSend = async (e) => {
    e.preventDefault();
    const content = message.trim();
    if (!content) return;
    await sendBoardMessage(boardId, content);
    setMessage('');
  };

  const messages = chatMessages[boardId] || [];

  return (
    <Modal isOpen={isOpen} onClose={onClose} wide tall>
      <Container>
        <Header>
          <Title id="chat-title">Board Chat — {boardName}</Title>
        </Header>
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
        <InputRow onSubmit={handleSend}>
          <Input
            aria-label="Type a message"
            value={message}
            placeholder="Type a message"
            onChange={(e) => setMessage(e.target.value)}
          />
          <Send type="submit">Send</Send>
        </InputRow>
      </Container>
    </Modal>
  );
};

export default ChatModal;


