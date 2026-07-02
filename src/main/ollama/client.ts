import type { OcrResult, OllamaConnectionResult, OllamaModel } from './types'

const CONNECT_TIMEOUT_MS = 5000
const OCR_TIMEOUT_MS = 180000

function withTimeout(ms: number): { signal: AbortSignal; cancel: () => void } {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)
  return { signal: controller.signal, cancel: () => clearTimeout(timer) }
}

export async function checkOllamaConnection(baseUrl: string): Promise<OllamaConnectionResult> {
  const { signal, cancel } = withTimeout(CONNECT_TIMEOUT_MS)
  try {
    const res = await fetch(`${baseUrl}/api/tags`, { signal })
    cancel()
    if (!res.ok) {
      return { ok: false, models: [], error: `Ollama ha risposto con stato ${res.status}` }
    }
    const data = (await res.json()) as { models?: OllamaModel[] }
    return { ok: true, models: data.models ?? [] }
  } catch (error) {
    cancel()
    const message =
      error instanceof Error && error.name === 'AbortError'
        ? 'Timeout: Ollama non ha risposto in tempo'
        : 'Impossibile raggiungere Ollama'
    return { ok: false, models: [], error: message }
  }
}

function formatOllamaError(rawMessage: string, status: number): string {
  const lower = rawMessage.toLowerCase()
  if (lower.includes('not found') || status === 404) {
    return `Modello non trovato su Ollama: ${rawMessage}. Scaricalo con "ollama pull <nome-modello>".`
  }
  if (lower.includes('memory') || lower.includes('cuda') || lower.includes('out of')) {
    return `Memoria insufficiente per eseguire il modello: ${rawMessage}`
  }
  return rawMessage
}

const REPEATED_LINE_THRESHOLD = 8

// Alcuni modelli OCR di piccole dimensioni non emettono un token di stop e
// continuano a ripetere l'ultima riga (es. blocchi ```) fino al limite di
// num_predict: tronchiamo la risposta al primo blocco di ripetizioni.
function trimRunawayRepetition(text: string): string {
  const lines = text.split('\n')
  let runStart = 0
  for (let i = 1; i <= lines.length; i++) {
    if (i < lines.length && lines[i] === lines[runStart] && lines[runStart].trim() !== '') {
      continue
    }
    if (i - runStart >= REPEATED_LINE_THRESHOLD) {
      return lines.slice(0, runStart).join('\n').trimEnd()
    }
    runStart = i
  }
  return text
}

export async function ocrImage(
  baseUrl: string,
  model: string,
  imageBase64: string,
  prompt: string
): Promise<OcrResult> {
  const { signal, cancel } = withTimeout(OCR_TIMEOUT_MS)
  try {
    const res = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt,
        images: [imageBase64],
        stream: false,
        // limita la generazione per evitare che un modello che non emette un
        // token di stop finisca in un loop e blocchi la pipeline a tempo indeterminato
        options: { num_predict: 2048 }
      }),
      signal
    })
    cancel()
    const data = await res.json().catch(() => null)
    if (!res.ok) {
      const rawMessage = data?.error ?? `Ollama ha risposto con stato ${res.status}`
      return { ok: false, error: formatOllamaError(rawMessage, res.status) }
    }
    if (!data || typeof data.response !== 'string') {
      return { ok: false, error: 'Risposta di Ollama non valida o vuota' }
    }
    return { ok: true, text: trimRunawayRepetition(data.response) }
  } catch (error) {
    cancel()
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        ok: false,
        error: 'Timeout: il modello non ha risposto in tempo (potrebbe essere troppo lento per questo hardware)'
      }
    }
    return { ok: false, error: 'Impossibile contattare Ollama: verifica che sia in esecuzione' }
  }
}
