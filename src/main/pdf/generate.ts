import { PDFDocument, PDFFont, StandardFonts, rgb } from 'pdf-lib'
import { existsSync, mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'

const A4_WIDTH = 595.28
const A4_HEIGHT = 841.89
const MARGIN = 50
const FONT_SIZE = 11
const LINE_HEIGHT = 14

// pdf-lib's standard fonts supportano solo WinAnsi: sostituiamo i caratteri
// non rappresentabili invece di far fallire la generazione del PDF.
function sanitizeForWinAnsi(text: string): string {
  return text.replace(/[^\t\n\r\x20-\x7E\xA0-\xFF€]/g, '?')
}

function wrapParagraph(paragraph: string, font: PDFFont, maxWidth: number): string[] {
  const words = paragraph.split(' ')
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word
    if (current && font.widthOfTextAtSize(candidate, FONT_SIZE) > maxWidth) {
      lines.push(current)
      current = word
    } else {
      current = candidate
    }
  }
  if (current) lines.push(current)
  return lines.length ? lines : ['']
}

function buildWrappedLines(text: string, font: PDFFont, maxWidth: number): string[] {
  const lines: string[] = []
  for (const paragraph of sanitizeForWinAnsi(text).split('\n')) {
    if (paragraph.trim() === '') {
      lines.push('')
    } else {
      lines.push(...wrapParagraph(paragraph, font, maxWidth))
    }
  }
  return lines
}

function slugify(name: string): string {
  const withoutExt = name.replace(/\.[^./\\]+$/, '')
  return withoutExt.replace(/[^a-zA-Z0-9-_]+/g, '-').replace(/^-+|-+$/g, '') || 'documento'
}

export async function generateOcrPdf(
  pages: string[],
  outputDir: string,
  sourceFileName: string
): Promise<{ path: string; fileName: string }> {
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const maxWidth = A4_WIDTH - MARGIN * 2

  for (const pageText of pages) {
    const lines = buildWrappedLines(pageText, font, maxWidth)
    let cursor = 0
    do {
      const page = doc.addPage([A4_WIDTH, A4_HEIGHT])
      let y = A4_HEIGHT - MARGIN
      while (cursor < lines.length && y > MARGIN) {
        const line = lines[cursor]
        if (line !== '') {
          page.drawText(line, { x: MARGIN, y, size: FONT_SIZE, font, color: rgb(0, 0, 0) })
        }
        y -= LINE_HEIGHT
        cursor++
      }
    } while (cursor < lines.length)
  }

  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true })
  }

  const fileName = `${slugify(sourceFileName)}-${Date.now()}.pdf`
  const outputPath = join(outputDir, fileName)
  const pdfBytes = await doc.save()
  writeFileSync(outputPath, pdfBytes)

  return { path: outputPath, fileName }
}
