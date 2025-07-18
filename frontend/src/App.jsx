import React from "react";
import { Global, css } from "@emotion/react";
import styled from "@emotion/styled";
import KanbanBoard from "./components/KanbanBoard";
import Sidebar from "./components/Sidebar";
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
  @media (max-width: 768px) {
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

function App() {
  const { isSidebarOpen, toggleSidebar } = useStore();

  return (
    <>
      <Global styles={globalStyles} />
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
    </>
  );
}

export default App;
