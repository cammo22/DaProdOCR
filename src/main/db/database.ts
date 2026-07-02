import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'

export interface DocumentRecord {
  id: number
  originalFileName: string
  processedAt: string
  ollamaModel: string
  pdfPath: string
  pdfFileName: string
  thumbnailPath: string | null
  textPreview: string
}

interface DocumentRow {
  id: number
  original_file_name: string
  processed_at: string
  ollama_model: string
  pdf_path: string
  pdf_file_name: string
  thumbnail_path: string | null
  text_preview: string
}

let db: Database.Database | null = null

function getDb(): Database.Database {
  if (db) return db
  const dbPath = join(app.getPath('userData'), 'library.db')
  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.exec(`
    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      original_file_name TEXT NOT NULL,
      processed_at TEXT NOT NULL,
      ollama_model TEXT NOT NULL,
      pdf_path TEXT NOT NULL,
      pdf_file_name TEXT NOT NULL,
      thumbnail_path TEXT,
      text_preview TEXT NOT NULL,
      full_text TEXT NOT NULL
    );

    CREATE VIRTUAL TABLE IF NOT EXISTS documents_fts USING fts5(
      full_text,
      content='documents',
      content_rowid='id'
    );
  `)
  return db
}

function toRecord(row: DocumentRow): DocumentRecord {
  return {
    id: row.id,
    originalFileName: row.original_file_name,
    processedAt: row.processed_at,
    ollamaModel: row.ollama_model,
    pdfPath: row.pdf_path,
    pdfFileName: row.pdf_file_name,
    thumbnailPath: row.thumbnail_path,
    textPreview: row.text_preview
  }
}

export function insertDocument(doc: {
  originalFileName: string
  ollamaModel: string
  pdfPath: string
  pdfFileName: string
  thumbnailPath: string | null
  fullText: string
}): DocumentRecord {
  const database = getDb()
  const processedAt = new Date().toISOString()
  const textPreview = doc.fullText.slice(0, 200)

  const insert = database.prepare(`
    INSERT INTO documents
      (original_file_name, processed_at, ollama_model, pdf_path, pdf_file_name, thumbnail_path, text_preview, full_text)
    VALUES
      (@originalFileName, @processedAt, @ollamaModel, @pdfPath, @pdfFileName, @thumbnailPath, @textPreview, @fullText)
  `)

  const info = insert.run({ ...doc, processedAt, textPreview })
  const id = Number(info.lastInsertRowid)

  database.prepare('INSERT INTO documents_fts (rowid, full_text) VALUES (?, ?)').run(id, doc.fullText)

  const row = database.prepare('SELECT * FROM documents WHERE id = ?').get(id) as DocumentRow
  return toRecord(row)
}

export function listDocuments(): DocumentRecord[] {
  const database = getDb()
  const rows = database
    .prepare('SELECT * FROM documents ORDER BY processed_at DESC')
    .all() as DocumentRow[]
  return rows.map(toRecord)
}

function toFtsQuery(query: string): string {
  return query
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => `"${token.replace(/"/g, '')}"*`)
    .join(' ')
}

export function deleteDocument(id: number): DocumentRecord | null {
  const database = getDb()
  const row = database.prepare('SELECT * FROM documents WHERE id = ?').get(id) as
    | DocumentRow
    | undefined
  if (!row) return null

  database.prepare('DELETE FROM documents_fts WHERE rowid = ?').run(id)
  database.prepare('DELETE FROM documents WHERE id = ?').run(id)

  return toRecord(row)
}

export function searchDocuments(query: string): DocumentRecord[] {
  if (!query.trim()) {
    return listDocuments()
  }
  const database = getDb()
  const rows = database
    .prepare(
      `SELECT documents.* FROM documents_fts
       JOIN documents ON documents.id = documents_fts.rowid
       WHERE documents_fts MATCH ?
       ORDER BY documents.processed_at DESC`
    )
    .all(toFtsQuery(query)) as DocumentRow[]
  return rows.map(toRecord)
}
