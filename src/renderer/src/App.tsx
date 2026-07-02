import { useEffect, useState } from 'react'
import OnboardingCheck from './pages/OnboardingCheck'
import Settings from './pages/Settings'
import DropZone from './pages/DropZone'
import Library from './pages/Library'

type View = 'checking' | 'blocked' | 'documenti' | 'libreria' | 'settings'

function App(): React.JSX.Element {
  const [view, setView] = useState<View>('checking')
  const [connectionError, setConnectionError] = useState<string | undefined>()

  const runCheck = async (): Promise<void> => {
    setView('checking')
    const result = await window.api.ollama.checkConnection()
    if (result.ok) {
      setView('documenti')
    } else {
      setConnectionError(result.error)
      setView('blocked')
    }
  }

  useEffect(() => {
    runCheck()
  }, [])

  if (view === 'checking') {
    return (
      <div className="app">
        <p>Verifica connessione a Ollama...</p>
      </div>
    )
  }

  if (view === 'blocked') {
    return (
      <OnboardingCheck
        error={connectionError}
        onRetry={runCheck}
        onOpenSettings={() => setView('settings')}
      />
    )
  }

  if (view === 'settings') {
    return <Settings onBack={runCheck} />
  }

  return (
    <div className="app app-wide">
      <header className="app-header">
        <h1>DaProdOCR</h1>
        <nav className="app-nav">
          <button
            className={view === 'documenti' ? 'active' : ''}
            onClick={() => setView('documenti')}
          >
            Documenti
          </button>
          <button
            className={view === 'libreria' ? 'active' : ''}
            onClick={() => setView('libreria')}
          >
            Libreria
          </button>
          <button onClick={() => setView('settings')}>Impostazioni</button>
        </nav>
      </header>
      {view === 'documenti' && <DropZone />}
      {view === 'libreria' && <Library />}
    </div>
  )
}

export default App
