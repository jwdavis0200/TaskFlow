import React, { useState } from "react";
import { Global, css } from "@emotion/react";
import styled from "@emotion/styled";
import { Toaster } from 'react-hot-toast';
import KanbanBoard from "./components/KanbanBoard";
import Sidebar from "./components/Sidebar";
import MigrationBanner from "./components/MigrationBanner";
import MigrationPanel from "./components/MigrationPanel";
import { useStore } from "./store";

const globalStyles = css`
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  html, body {
    margin: 0 !important;
    padding: 0 !important;
    width: 100% !important;
    height: 100% !important;
    overflow-x: hidden !important;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto",
      "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans",
      "Helvetica Neue", sans-serif !important;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    display: block !important;
    place-items: initial !important;
  }

  #root {
    min-height: 100vh;
    width: 100%;
    margin: 0;
    padding: 0;
  }

  button {
    font-family: inherit;
  }

  input,
  textarea,
  select {
    font-family: inherit;
  }
`;

const AppContainer = styled.div`
  display: flex;
  height: 100vh;
`;

const MainContent = styled.div`
  flex: 1;
  overflow: hidden;
  transition: margin-left 0.3s ease;
  margin-left: 60px;
  @media (hover: none) and (pointer: coarse), (max-width: 768px) {
    margin-left: 0;
  }
`;

const MobileOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 998;
  opacity: ${props => props.isVisible ? 1 : 0};
  visibility: ${props => props.isVisible ? 'visible' : 'hidden'};
  transition: opacity 0.3s ease, visibility 0.3s ease;
  
  @media (min-width: 769px) {
    display: none;
  }
`;

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
`;

const ModalContent = styled.div`
  position: relative;
  max-width: 1200px;
  max-height: 90vh;
  width: 100%;
  overflow-y: auto;
  border-radius: 8px;
`;

function App() {
  const { isSidebarOpen, toggleSidebar } = useStore();
  const [showMigrationPanel, setShowMigrationPanel] = useState(false);

  return (
    <>
      <Global styles={globalStyles} />
      
      {/* Migration Banner - shows at top when needed */}
      <MigrationBanner onOpenMigration={() => setShowMigrationPanel(true)} />
      
      <AppContainer>
        <Sidebar />
        <MobileOverlay
          isVisible={isSidebarOpen}
          onClick={toggleSidebar}
          aria-hidden="true"
        />
        <MainContent isSidebarOpen={isSidebarOpen}>
          <KanbanBoard />
        </MainContent>
      </AppContainer>

      {/* Migration Panel Modal */}
      {showMigrationPanel && (
        <ModalOverlay onClick={() => setShowMigrationPanel(false)}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <MigrationPanel />
            <div style={{ textAlign: 'right', padding: '20px' }}>
              <button 
                onClick={() => setShowMigrationPanel(false)}
                style={{
                  padding: '8px 16px',
                  background: '#666',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </ModalContent>
        </ModalOverlay>
      )}
      
      {/* Toast notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: 'rgba(255, 255, 255, 0.95)',
            color: '#333',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '12px',
            padding: '16px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
          },
          success: {
            iconTheme: {
              primary: '#4CAF50',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#f44336',
              secondary: '#fff',
            },
            duration: 6000, // Error messages stay longer
          },
        }}
      />
    </>
  );
}

export default App;
