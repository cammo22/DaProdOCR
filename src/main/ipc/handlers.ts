import { BrowserWindow, dialog, ipcMain, shell } from 'electron'
import { copyFile, unlink } from 'fs/promises'
import { basename } from 'path'
import { checkOllamaConnection, ocrImage } from '../ollama/client'
import { generateOcrPdf } from '../pdf/generate'
import { insertDocument, listDocuments, searchDocuments, deleteDocument } from '../db/database'
import { saveThumbnail } from '../db/thumbnails'
import { getSettings, updateSettings, getOllamaBaseUrl, type AppSettings } from '../settings'

export function registerIpcHandlers(): void {
  ipcMain.handle('settings:get', () => getSettings())

  ipcMain.handle('settings:update', (_event, partial: Partial<AppSettings>) =>
    updateSettings(partial)
  )

  ipcMain.handle(
    'ollama:check-connection',
    async (_event, override?: { host: string; port: number }) => {
      const baseUrl = override
        ? `http://${override.host}:${override.port}`
        : getOllamaBaseUrl(getSettings())
      return checkOllamaConnection(baseUrl)
    }
  )

  ipcMain.handle('ocr:process-page', async (_event, imageBase64: string) => {
    const settings = getSettings()
    const baseUrl = getOllamaBaseUrl(settings)
    return ocrImage(baseUrl, settings.ollamaModel, imageBase64, settings.ocrPrompt)
  })

  ipcMain.handle(
    'library:create-document',
    async (
      _event,
      payload: { sourceFileName: string; pages: string[]; thumbnailBase64: string }
    ) => {
      try {
        const settings = getSettings()
        const pdfResult = await generateOcrPdf(
          payload.pages,
          settings.outputFolder,
          payload.sourceFileName
        )
        const thumbnailPath = saveThumbnail(payload.thumbnailBase64)
        const document = insertDocument({
          originalFileName: payload.sourceFileName,
          ollamaModel: settings.ollamaModel,
          pdfPath: pdfResult.path,
          pdfFileName: pdfResult.fileName,
          thumbnailPath,
          fullText: payload.pages.join('\n\n')
        })
        return { ok: true as const, document }
      } catch (error) {
        return {
          ok: false as const,
          error: error instanceof Error ? error.message : 'Errore durante la creazione del documento'
        }
      }
    }
  )

  ipcMain.handle('library:list', () => listDocuments())

  ipcMain.handle('library:search', (_event, query: string) => searchDocuments(query))

  ipcMain.handle('library:delete-document', async (_event, id: number) => {
    const document = deleteDocument(id)
    if (!document) {
      return { ok: false as const, error: 'Documento non trovato' }
    }
    await Promise.all(
      [document.pdfPath, document.thumbnailPath]
        .filter((path): path is string => Boolean(path))
        .map((path) => unlink(path).catch(() => undefined))
    )
    return { ok: true as const }
  })

  ipcMain.handle('shell:open-path', async (_event, filePath: string) => {
    const result = await shell.openPath(filePath)
    return { ok: result === '', error: result || undefined }
  })

  ipcMain.handle(
    'document:export',
    async (_event, payload: { sourcePath: string; suggestedName: string }) => {
      const window = BrowserWindow.getFocusedWindow()
      const saveDialogOptions = {
        defaultPath: payload.suggestedName || basename(payload.sourcePath),
        filters: [{ name: 'PDF', extensions: ['pdf'] }]
      }
      const { canceled, filePath } = window
        ? await dialog.showSaveDialog(window, saveDialogOptions)
        : await dialog.showSaveDialog(saveDialogOptions)
      if (canceled || !filePath) {
        return { ok: false as const, canceled: true }
      }
      try {
        await copyFile(payload.sourcePath, filePath)
        return { ok: true as const, path: filePath }
      } catch (error) {
        return {
          ok: false as const,
          canceled: false,
          error: error instanceof Error ? error.message : "Errore durante l'esportazione"
        }
      }
    }
  )
}
