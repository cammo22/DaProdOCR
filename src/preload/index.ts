import { contextBridge, ipcRenderer } from 'electron'
import type { AppSettings } from '../main/settings'
import type { OcrResult, OllamaConnectionResult } from '../main/ollama/types'
import type { DocumentRecord } from '../main/db/database'

const api = {
  settings: {
    get: (): Promise<AppSettings> => ipcRenderer.invoke('settings:get'),
    update: (partial: Partial<AppSettings>): Promise<AppSettings> =>
      ipcRenderer.invoke('settings:update', partial)
  },
  ollama: {
    checkConnection: (override?: {
      host: string
      port: number
    }): Promise<OllamaConnectionResult> => ipcRenderer.invoke('ollama:check-connection', override)
  },
  ocr: {
    processPage: (imageBase64: string): Promise<OcrResult> =>
      ipcRenderer.invoke('ocr:process-page', imageBase64)
  },
  library: {
    createDocument: (
      sourceFileName: string,
      pages: string[],
      thumbnailBase64: string
    ): Promise<
      { ok: true; document: DocumentRecord } | { ok: false; error: string }
    > => ipcRenderer.invoke('library:create-document', { sourceFileName, pages, thumbnailBase64 }),
    list: (): Promise<DocumentRecord[]> => ipcRenderer.invoke('library:list'),
    search: (query: string): Promise<DocumentRecord[]> =>
      ipcRenderer.invoke('library:search', query),
    deleteDocument: (id: number): Promise<{ ok: true } | { ok: false; error: string }> =>
      ipcRenderer.invoke('library:delete-document', id)
  },
  document: {
    export: (
      sourcePath: string,
      suggestedName: string
    ): Promise<
      { ok: true; path: string } | { ok: false; canceled?: boolean; error?: string }
    > => ipcRenderer.invoke('document:export', { sourcePath, suggestedName })
  },
  shell: {
    openPath: (filePath: string): Promise<{ ok: boolean; error?: string }> =>
      ipcRenderer.invoke('shell:open-path', filePath)
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.api = api
}
