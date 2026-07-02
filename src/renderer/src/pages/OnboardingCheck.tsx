interface Props {
  error?: string
  onRetry: () => void
  onOpenSettings: () => void
}

function OnboardingCheck({ error, onRetry, onOpenSettings }: Props): React.JSX.Element {
  return (
    <div className="app onboarding">
      <h1>Ollama non raggiungibile</h1>
      {error && <p className="error">{error}</p>}
      <p>
        Per usare DaProdOCR serve Ollama in esecuzione in locale, con un modello vision installato
        per l&apos;OCR.
      </p>
      <ol>
        <li>
          Installa Ollama da <code>ollama.com</code> se non lo hai già fatto.
        </li>
        <li>
          Avvialo da terminale con:
          <br />
          <code>ollama serve</code>
        </li>
        <li>
          Scarica un modello vision per l&apos;OCR, ad esempio:
          <br />
          <code>ollama pull glm-ocr-hq</code>
        </li>
        <li>
          Verifica che risponda su <code>http://localhost:11434</code>
        </li>
      </ol>
      <div className="actions">
        <button onClick={onRetry}>Riprova connessione</button>
        <button onClick={onOpenSettings}>Impostazioni host/porta</button>
      </div>
    </div>
  )
}

export default OnboardingCheck
