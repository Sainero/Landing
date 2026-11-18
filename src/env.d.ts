interface ImportMetaEnv {
  /** Адрес облачной версии, например https://app.htmlpptx.ru */
  readonly PUBLIC_CLOUD_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
