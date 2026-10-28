interface ImportMetaEnv {
  /** 'static' reads exported JSON from public/data instead of the API. */
  readonly VITE_DATA_MODE?: 'static' | 'api'
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
