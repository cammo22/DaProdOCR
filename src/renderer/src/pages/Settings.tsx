import { useEffect, useState } from 'react'

interface Props {
  onBack: () => void
}

type TestStatus = 'idle' | 'testing' | 'ok' | 'error'

function Settings({ onBack }: Props): React.JSX.Element {
  const [form, setForm] = useState<AppSettings | null>(null)
  const [availableModels, setAvailableModels] = useState<OllamaModel[]>([])
  const [testStatus, setTestStatus] = useState<TestStatus>('idle')
  const [testError, setTestError] = useState<string | undefined>()
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    window.api.settings.get().then((s) => {
      setForm(s)
      testConnection(s.ollamaHost, s.ollamaPort)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const testConnection = async (host: string, port: number): Promise<void> => {
    setTestStatus('testing')
    setTestError(undefined)
    const result = await window.api.ollama.checkConnection({ host, port })
    if (result.ok) {
      setAvailableModels(result.models)
      setTestStatus('ok')
    } else {
      setAvailableModels([])
      setTestStatus('error')
      setTestError(result.error)
    }
  }

  if (!form) {
    return <div className="app">Caricamento impostazioni...</div>
  }

  const handleSave = async (): Promise<void> => {
    await window.api.settings.update(form)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="app settings">
      <header className="app-header">
        <h1>Impostazioni</h1>
        <button onClick={onBack}>Indietro</button>
      </header>

      <div className="field">
        <label>Host Ollama</label>
        <input
          value={form.ollamaHost}
          onChange={(e) => setForm({ ...form, ollamaHost: e.target.value })}
        />
      </div>

      <div className="field">
        <label>Porta</label>
        <input
          type="number"
          value={form.ollamaPort}
          onChange={(e) => setForm({ ...form, ollamaPort: Number(e.target.value) })}
        />
      </div>

      <button onClick={() => testConnection(form.ollamaHost, form.ollamaPort)}>
        Testa connessione
      </button>

      {testStatus === 'testing' && <p>Verifica in corso...</p>}
      {testStatus === 'error' && <p className="error">{testError}</p>}
      {testStatus === 'ok' && (
        <p className="success">Connesso — {availableModels.length} modelli trovati</p>
      )}

      <div className="field">
        <label>Modello OCR</label>
        <select
          value={form.ollamaModel}
          onChange={(e) => setForm({ ...form, ollamaModel: e.target.value })}
        >
          <option value={form.ollamaModel}>{form.ollamaModel}</option>
          {availableModels
            .filter((m) => m.name !== form.ollamaModel)
            .map((m) => (
              <option key={m.name} value={m.name}>
                {m.name}
              </option>
            ))}
        </select>
      </div>

      <div className="field">
        <label>Prompt OCR</label>
        <input
          value={form.ocrPrompt}
          onChange={(e) => setForm({ ...form, ocrPrompt: e.target.value })}
        />
      </div>

      <div className="field">
        <label>Cartella di output PDF</label>
        <input
          value={form.outputFolder}
          onChange={(e) => setForm({ ...form, outputFolder: e.target.value })}
        />
      </div>

      <button onClick={handleSave}>Salva</button>
      {saved && <span className="success"> Salvato</span>}
    </div>
  )
}

export default Settings
