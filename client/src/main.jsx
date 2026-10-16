import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Router } from "./lib/router.jsx";
import { AuthProvider } from "./lib/auth.jsx";
import App from "./App.jsx";
import "./styles.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Router>
      <AuthProvider>
        <App />
      </AuthProvider>
    </Router>
  </StrictMode>
);
