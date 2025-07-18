import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import AuthGuard from "./components/AuthGuard";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthGuard>
      <App />
    </AuthGuard>
  </React.StrictMode>
);
