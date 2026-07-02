import * as pdfjsLib from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl

const TARGET_DPI = 200
const PDF_DEFAULT_DPI = 72

export interface RenderedPage {
  pageNumber: number
  dataUrl: string
  base64: string
}

export async function pdfToImages(file: File): Promise<RenderedPage[]> {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  const pages: RenderedPage[] = []

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber)
    const scale = TARGET_DPI / PDF_DEFAULT_DPI
    const viewport = page.getViewport({ scale })

    const canvas = document.createElement('canvas')
    canvas.width = viewport.width
    canvas.height = viewport.height
    const context = canvas.getContext('2d')
    if (!context) {
      throw new Error('Impossibile creare il contesto canvas per il rendering del PDF')
    }

    await page.render({ canvasContext: context, viewport, canvas }).promise

    const dataUrl = canvas.toDataURL('image/png')
    pages.push({
      pageNumber,
      dataUrl,
      base64: dataUrl.replace(/^data:image\/png;base64,/, '')
    })
  }

  return pages
}
