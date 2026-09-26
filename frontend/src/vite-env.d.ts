/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_NAME: string;
  readonly VITE_APP_ENVIRONMENT: string;
  readonly VITE_FRONTEND_URL: string;
  readonly VITE_BACKEND_URL: string;
  readonly VITE_API_BASE_URL: string;
  readonly VITE_DEFAULT_LANGUAGE: string;
  readonly VITE_DEFAULT_TIMEZONE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
