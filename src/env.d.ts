interface ImportMetaEnv {
  /** Адрес облачной версии, например https://app.slideria.ru */
  readonly PUBLIC_CLOUD_URL?: string;
  /** Ссылка на установщик программы для Windows */
  readonly PUBLIC_DOWNLOAD_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
