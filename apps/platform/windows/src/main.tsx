import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { DesktopLauncher } from "./DesktopLauncher";
import "./styles.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("CXApp desktop root element is missing.");
}

createRoot(root).render(
  <StrictMode>
    <DesktopLauncher />
  </StrictMode>
);
