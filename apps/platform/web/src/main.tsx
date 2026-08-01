import { createRoot } from "react-dom/client";
import { GlobalLoader } from "@cxapp/ui/components/global-loader";
import "@cxapp/ui/styles.css";
import "./styles.css";

const root = createRoot(document.getElementById("root") as HTMLElement);
root.render(<GlobalLoader />);

const response = await fetch("/api/platform/public/runtime-config");
if (!response.ok) {
  throw new Error(`Runtime configuration failed to load: ${response.status}`);
}
const envelope = (await response.json()) as {
  data?: Record<string, string>;
  success: boolean;
};
if (!envelope.success || !envelope.data) {
  throw new Error("Runtime configuration response is invalid.");
}
window.__CXAPP_RUNTIME_CONFIG__ = Object.freeze(envelope.data);

const { PlatformWebApp } = await import("./app/PlatformWebApp");
root.render(<PlatformWebApp />);
