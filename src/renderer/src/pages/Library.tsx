import { useEffect, useRef, useState } from 'react'
import { toAppFileUrl } from '../lib/fileUrl'

interface DayGroup {
  key: string
  label: string
  documents: DocumentRecord[]
}

function dayKey(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  )
}

function formatDayLabel(iso: string): string {
  const date = new Date(iso)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)

  if (isSameDay(date, today)) return 'Oggi'
  if (isSameDay(date, yesterday)) return 'Ieri'
  return date.toLocaleDateString('it-IT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
}

function groupByDay(documents: DocumentRecord[]): DayGroup[] {
  const groups: DayGroup[] = []
  for (const doc of documents) {
    const key = dayKey(doc.processedAt)
    const last = groups[groups.length - 1]
    if (last && last.key === key) {
      last.documents.push(doc)
    } else {
      groups.push({ key, label: formatDayLabel(doc.processedAt), documents: [doc] })
    }
  }
  return groups
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
}

function Library(): React.JSX.Element {
  const [documents, setDocuments] = useState<DocumentRecord[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [previewDoc, setPreviewDoc] = useState<DocumentRecord | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const load = async (searchQuery: string): Promise<void> => {
    setLoading(true)
    const docs = searchQuery.trim()
      ? await window.api.library.search(searchQuery)
      : await window.api.library.list()
    setDocuments(docs)
    setLoading(false)
  }

  useEffect(() => {
    load('')
  }, [])

  const handleQueryChange = (value: string): void => {
    setQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => load(value), 250)
  }

  const openDocument = async (doc: DocumentRecord): Promise<void> => {
    const result = await window.api.shell.openPath(doc.pdfPath)
    if (!result.ok) {
      setMessage(result.error ?? 'Impossibile aprire il PDF')
    }
  }

  const exportDocument = async (doc: DocumentRecord): Promise<void> => {
    const result = await window.api.document.export(doc.pdfPath, doc.pdfFileName)
    if (result.ok) {
      setMessage(`Esportato in ${result.path}`)
    } else if (!result.canceled) {
      setMessage(result.error ?? "Errore durante l'esportazione")
    }
  }

  const deleteDocument = async (doc: DocumentRecord): Promise<void> => {
    const confirmed = window.confirm(`Eliminare "${doc.originalFileName}"? L'azione non è reversibile.`)
    if (!confirmed) return

    setDeletingId(doc.id)
    const result = await window.api.library.deleteDocument(doc.id)
    setDeletingId(null)

    if (result.ok) {
      setDocuments((prev) => prev.filter((d) => d.id !== doc.id))
      if (previewDoc?.id === doc.id) setPreviewDoc(null)
      setMessage('Documento eliminato')
    } else {
      setMessage(result.error ?? "Errore durante l'eliminazione")
    }
  }

  const groups = groupByDay(documents)

  return (
    <div className="library">
      <input
        className="library-search"
        type="search"
        placeholder="Cerca nel testo dei documenti..."
        value={query}
        onChange={(e) => handleQueryChange(e.target.value)}
      />

      {message && <p className="success">{message}</p>}

      {loading && <p>Caricamento...</p>}

      {!loading && groups.length === 0 && <p>Nessun documento ancora elaborato.</p>}

      {groups.map((group) => (
        <div key={group.key} className="library-day-group">
          <h3 className="library-day-header">{group.label}</h3>
          <div className="library-grid">
            {group.documents.map((doc) => (
              <div key={doc.id} className="library-card">
                <button className="library-card-thumb" onClick={() => setPreviewDoc(doc)}>
                  {doc.thumbnailPath ? (
                    <img src={toAppFileUrl(doc.thumbnailPath)} alt={doc.originalFileName} />
                  ) : (
                    <span>PDF</span>
                  )}
                </button>
                <div className="library-card-body">
                  <p className="library-card-title" title={doc.originalFileName}>
                    {doc.originalFileName}
                  </p>
                  <p className="library-card-meta">
                    {formatTime(doc.processedAt)} · {doc.ollamaModel}
                  </p>
                  <p className="library-card-preview">{doc.textPreview}</p>
                  <div className="library-card-actions">
                    <button onClick={() => openDocument(doc)}>Apri</button>
                    <button onClick={() => exportDocument(doc)}>Esporta</button>
                    <button
                      className="library-card-delete"
                      disabled={deletingId === doc.id}
                      onClick={() => deleteDocument(doc)}
                    >
                      {deletingId === doc.id ? 'Elimino...' : 'Elimina'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {previewDoc && (
        <div className="library-preview-overlay" onClick={() => setPreviewDoc(null)}>
          <div className="library-preview-modal" onClick={(e) => e.stopPropagation()}>
            <div className="library-preview-header">
              <p title={previewDoc.originalFileName}>{previewDoc.originalFileName}</p>
              <button onClick={() => setPreviewDoc(null)}>Chiudi</button>
            </div>
            {previewDoc.thumbnailPath ? (
              <img
                className="library-preview-image"
                src={toAppFileUrl(previewDoc.thumbnailPath)}
                alt={previewDoc.originalFileName}
              />
            ) : (
              <p>Nessuna anteprima disponibile</p>
            )}
            <div className="library-preview-actions">
              <button onClick={() => openDocument(previewDoc)}>Apri PDF</button>
              <button onClick={() => exportDocument(previewDoc)}>Esporta</button>
              <button
                className="library-card-delete"
                disabled={deletingId === previewDoc.id}
                onClick={() => deleteDocument(previewDoc)}
              >
                {deletingId === previewDoc.id ? 'Elimino...' : 'Elimina'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Library
