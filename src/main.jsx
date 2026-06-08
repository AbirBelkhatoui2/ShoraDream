import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import "./index.css";
import "./i18n"; // ✅ i18n

import { AuthProvider } from "./context/AuthContext.jsx";
import { DreamsProvider } from "./context/DreamsContext.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      <DreamsProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </DreamsProvider>
    </AuthProvider>
  </React.StrictMode>
);