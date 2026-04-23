/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GEMINI_API_KEY?: string;
  readonly VITE_SARMOK_DASHBOARD_API_URL?: string;
  readonly VITE_SARMOK_BASIC_AUTH_USERNAME?: string;
  readonly VITE_SARMOK_BASIC_AUTH_PASSWORD?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
