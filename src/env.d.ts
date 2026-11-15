/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the Aegis backend (defaults to http://localhost:8787). */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
