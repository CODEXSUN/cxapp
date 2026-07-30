/// <reference types="vite/client" />

interface Window {
  __CXAPP_RUNTIME_CONFIG__?: Readonly<Record<string, string>>;
}

declare const __APP_VERSION__: string;
