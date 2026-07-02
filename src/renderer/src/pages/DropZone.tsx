import { useCallback, useState } from 'react'
import { pdfToImages } from '../lib/pdfToImages'
import { createThumbnailBase64 } from '../lib/thumbnail'

interface PageOcrResult {
  pageNumber: number
  text: string
}

interface PageImage {
  base64: string
  dataUrl: string
}

type Status = 'idle' | 'extracting' | 'processing' | 'generating-pdf' | 'done' | 'error'

interface Props {
  onGenerated?: () => void
}

const ACCEPTED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.pdf']

function getExtension(name: string): string {
  const idx = name.lastIndexOf('.')
  return idx === -1 ? '' : name.slice(idx).toLowerCase()
}

function imageFileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

function DropZone({ onGenerated }: Props): React.JSX.Element {
  const [status, setStatus] = useState<Status>('idle')
  const [fileName, setFileName] = useState('')
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [results, setResults] = useState<PageOcrResult[]>([])
  const [error, setError] = useState('')
  const [isDragOver, setIsDragOver] = useState(false)
  const [pdfInfo, setPdfInfo] = useState<{ path: string; fileName: string } | null>(null)
  const [exportMessage, setExportMessage] = useState('')

  const processFile = useCallback(async (file: File) => {
    const ext = getExtension(file.name)
    if (!ACCEPTED_EXTENSIONS.includes(ext)) {
      setStatus('error')
      setError(`Formato non supportato: ${ext || 'sconosciuto'}. Usa PNG, JPG o PDF.`)
      return
    }

    setFileName(file.name)
    setResults([])
    setError('')
    setPdfInfo(null)
    setExportMessage('')

    try {
      let pageImages: PageImage[]
      if (ext === '.pdf') {
        setStatus('extracting')
        const pages = await pdfToImages(file)
        pageImages = pages.map((p) => ({ base64: p.base64, dataUrl: p.dataUrl }))
      } else {
        const dataUrl = await imageFileToDataUrl(file)
        pageImages = [{ base64: dataUrl.replace(/^data:[^;]+;base64,/, ''), dataUrl }]
      }

      setStatus('processing')
      setProgress({ current: 0, total: pageImages.length })

      const pageResults: PageOcrResult[] = []
      for (let i = 0; i < pageImages.length; i++) {
        const result = await window.api.ocr.processPage(pageImages[i].base64)
        if (!result.ok) {
          setError(result.error ?? "Errore sconosciuto durante l'OCR")
          setStatus('error')
          return
        }
        pageResults.push({ pageNumber: i + 1, text: result.text ?? '' })
        setProgress({ current: i + 1, total: pageImages.length })
      }

      setResults(pageResults)

      setStatus('generating-pdf')
      const thumbnailBase64 = await createThumbnailBase64(pageImages[0].dataUrl)
      const createResult = await window.api.library.createDocument(
        file.name,
        pageResults.map((r) => r.text),
        thumbnailBase64
      )
      if (!createResult.ok) {
        setError(createResult.error)
        setStatus('error')
        return
      }
      setPdfInfo({
        path: createResult.document.pdfPath,
        fileName: createResult.document.pdfFileName
      })
      setStatus('done')
      onGenerated?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore durante l'elaborazione del file")
      setStatus('error')
    }
  }, [onGenerated])

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setIsDragOver(false)
      const file = e.dataTransfer.files[0]
      if (file) {
        processFile(file)
      }
    },
    [processFile]
  )

  const reset = (): void => {
    setStatus('idle')
    setResults([])
    setError('')
    setFileName('')
    setPdfInfo(null)
    setExportMessage('')
  }

  const openPdf = async (): Promise<void> => {
    if (!pdfInfo) return
    const result = await window.api.shell.openPath(pdfInfo.path)
    if (!result.ok) {
      setExportMessage(result.error ?? 'Impossibile aprire il PDF')
    }
  }

  const exportPdf = async (): Promise<void> => {
    if (!pdfInfo) return
    const result = await window.api.document.export(pdfInfo.path, pdfInfo.fileName)
    if (result.ok) {
      setExportMessage(`Esportato in ${result.path}`)
    } else if (!result.canceled) {
      setExportMessage(result.error ?? "Errore durante l'esportazione")
    }
  }

  return (
    <div>
      {(status === 'idle' || status === 'error') && (
        <div
          className={`dropzone ${isDragOver ? 'drag-over' : ''}`}
          onDragOver={(e) => {
            e.preventDefault()
            setIsDragOver(true)
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
        >
          <p>Trascina qui un&apos;immagine (PNG/JPG) o un PDF scansionato</p>
        </div>
      )}

      {status === 'error' && (
        <div className="error-banner">
          <p className="error">{error}</p>
          <button onClick={reset}>Riprova</button>
        </div>
      )}

      {status === 'extracting' && <p>Estrazione pagine da {fileName}...</p>}

      {status === 'processing' && (
        <div className="progress">
          <p>
            OCR in corso su {fileName}: pagina {progress.current}/{progress.total}
          </p>
          <div className="progress-bar">
            <div
              className="progress-bar-fill"
              style={{ width: `${(progress.current / progress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {status === 'generating-pdf' && <p>Generazione del PDF...</p>}

      {status === 'done' && pdfInfo && (
        <div className="results">
          <p>
            PDF generato da {fileName}: <strong>{pdfInfo.fileName}</strong>
          </p>
          <div className="actions">
            <button onClick={openPdf}>Apri PDF</button>
            <button onClick={exportPdf}>Esporta...</button>
            <button onClick={reset}>Elabora un altro documento</button>
          </div>
          {exportMessage && <p className="success">{exportMessage}</p>}
          {results.map((r) => (
            <details key={r.pageNumber}>
              <summary>Testo pagina {r.pageNumber}</summary>
              <pre>{r.text}</pre>
            </details>
          ))}
        </div>
      )}
    </div>
  )
}

export default DropZone
