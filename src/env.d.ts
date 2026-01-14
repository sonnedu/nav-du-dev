declare const __APP_VERSION__: string;
declare const __APP_COMMIT__: string;
declare const __BUILD_TIME__: string;

interface ImportMetaEnv {
  readonly VITE_FAVICON_PROXY_BASE?: string;
  readonly VITE_SIDEBAR_TITLE?: string;
  readonly VITE_BANNER_TITLE?: string;
  readonly VITE_TIME_ZONE?: string;
  readonly VITE_SIDEBAR_AVATAR_SRC?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
