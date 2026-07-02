const THUMBNAIL_MAX_WIDTH = 240

export async function createThumbnailBase64(dataUrl: string): Promise<string> {
  const img = new Image()
  img.src = dataUrl
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = () => reject(new Error('Impossibile caricare l\'immagine per la thumbnail'))
  })

  const scale = Math.min(1, THUMBNAIL_MAX_WIDTH / img.width)
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(img.width * scale))
  canvas.height = Math.max(1, Math.round(img.height * scale))

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Impossibile creare il contesto canvas per la thumbnail')
  }
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

  return canvas.toDataURL('image/png').replace(/^data:image\/png;base64,/, '')
}
