export interface OllamaModel {
  name: string
  size: number
  modified_at: string
}

export interface OllamaConnectionResult {
  ok: boolean
  models: OllamaModel[]
  error?: string
}

export interface OcrResult {
  ok: boolean
  text?: string
  error?: string
}
