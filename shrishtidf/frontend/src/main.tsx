import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import App from "./App";
import { CustomerAuthProvider } from "./context/customer-auth-context";
import { MilkFillLoader } from "./components/MilkFillLoader";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <MilkFillLoader>
        <CustomerAuthProvider>
          <App />
        </CustomerAuthProvider>
      </MilkFillLoader>
    </BrowserRouter>
  </StrictMode>,
);
