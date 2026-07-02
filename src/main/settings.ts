import { app } from 'electron'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

export interface AppSettings {
  ollamaHost: string
  ollamaPort: number
  ollamaModel: string
  ocrPrompt: string
  outputFolder: string
}

function defaultSettings(): AppSettings {
  return {
    ollamaHost: 'localhost',
    ollamaPort: 11434,
    ollamaModel: 'glm-ocr-hq',
    ocrPrompt: 'Text Recognition:',
    outputFolder: join(app.getPath('documents'), 'OCR-Locale')
  }
}

function settingsFilePath(): string {
  return join(app.getPath('userData'), 'settings.json')
}

export function getSettings(): AppSettings {
  const filePath = settingsFilePath()
  if (!existsSync(filePath)) {
    return defaultSettings()
  }
  try {
    const raw = readFileSync(filePath, 'utf-8')
    return { ...defaultSettings(), ...JSON.parse(raw) }
  } catch {
    return defaultSettings()
  }
}

export function updateSettings(partial: Partial<AppSettings>): AppSettings {
  const current = getSettings()
  const next = { ...current, ...partial }
  const userDataDir = app.getPath('userData')
  if (!existsSync(userDataDir)) {
    mkdirSync(userDataDir, { recursive: true })
  }
  writeFileSync(settingsFilePath(), JSON.stringify(next, null, 2), 'utf-8')
  return next
}

export function getOllamaBaseUrl(settings: AppSettings): string {
  return `http://${settings.ollamaHost}:${settings.ollamaPort}`
}
