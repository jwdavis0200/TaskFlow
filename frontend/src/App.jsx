import React from "react";
import { Global, css } from "@emotion/react";
import styled from "@emotion/styled";
import KanbanBoard from "./components/KanbanBoard";
import Sidebar from "./components/Sidebar";

const globalStyles = css`
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto",
      "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans",
      "Helvetica Neue", sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    min-height: 100vh;
  }

  #root {
    min-height: 100vh;
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
`;

function App() {
  return (
    <>
      <Global styles={globalStyles} />
      <AppContainer>
        <Sidebar />
        <MainContent>
          <KanbanBoard />
        </MainContent>
      </AppContainer>
    </>
  );
}

export default App;
