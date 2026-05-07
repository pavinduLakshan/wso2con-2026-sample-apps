import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AsgardeoProvider } from "@asgardeo/react";
import App from "./App.jsx";
import "./styles.css";

const clientId = import.meta.env.VITE_ASGARDEO_CLIENT_ID;
const baseUrl = import.meta.env.VITE_ASGARDEO_BASE_URL;
const asgardeoReady = Boolean(clientId && baseUrl);

createRoot(document.getElementById("root")).render(
  <StrictMode>
    {asgardeoReady ? (
      <AsgardeoProvider clientId={clientId} baseUrl={baseUrl}>
        <App authReady />
      </AsgardeoProvider>
    ) : (
      <App authReady={false} />
    )}
  </StrictMode>
);
