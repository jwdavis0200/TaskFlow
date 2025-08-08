import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import AuthGuard from "./components/AuthGuard";
import ThemeManager from "./components/ThemeManager";
import "./styles/theme.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ThemeManager />
    <AuthGuard>
      <App />
    </AuthGuard>
  </React.StrictMode>
);
