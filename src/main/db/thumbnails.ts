import { app } from 'electron'
import { existsSync, mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'
import { randomUUID } from 'crypto'

export function saveThumbnail(base64: string): string {
  const dir = join(app.getPath('userData'), 'thumbnails')
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  const filePath = join(dir, `${randomUUID()}.png`)
  writeFileSync(filePath, Buffer.from(base64, 'base64'))
  return filePath
}
