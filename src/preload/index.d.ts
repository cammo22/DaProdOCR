export {}

declare global {
  interface AppSettings {
    ollamaHost: string
    ollamaPort: number
    ollamaModel: string
    ocrPrompt: string
    outputFolder: string
  }

  interface OllamaModel {
    name: string
    size: number
    modified_at: string
  }

  interface OllamaConnectionResult {
    ok: boolean
    models: OllamaModel[]
    error?: string
  }

  interface OcrResult {
    ok: boolean
    text?: string
    error?: string
  }

  interface DocumentRecord {
    id: number
    originalFileName: string
    processedAt: string
    ollamaModel: string
    pdfPath: string
    pdfFileName: string
    thumbnailPath: string | null
    textPreview: string
  }

  type LibraryCreateResult =
    | { ok: true; document: DocumentRecord }
    | { ok: false; error: string }

  type DocumentExportResult =
    | { ok: true; path: string }
    | { ok: false; canceled?: boolean; error?: string }

  interface Api {
    settings: {
      get: () => Promise<AppSettings>
      update: (partial: Partial<AppSettings>) => Promise<AppSettings>
    }
    ollama: {
      checkConnection: (override?: {
        host: string
        port: number
      }) => Promise<OllamaConnectionResult>
    }
    ocr: {
      processPage: (imageBase64: string) => Promise<OcrResult>
    }
    library: {
      createDocument: (
        sourceFileName: string,
        pages: string[],
        thumbnailBase64: string
      ) => Promise<LibraryCreateResult>
      list: () => Promise<DocumentRecord[]>
      search: (query: string) => Promise<DocumentRecord[]>
      deleteDocument: (id: number) => Promise<{ ok: true } | { ok: false; error: string }>
    }
    document: {
      export: (sourcePath: string, suggestedName: string) => Promise<DocumentExportResult>
    }
    shell: {
      openPath: (filePath: string) => Promise<{ ok: boolean; error?: string }>
    }
  }

  interface Window {
    api: Api
  }
}
