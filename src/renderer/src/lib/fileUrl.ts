export function toFileUrl(path: string): string {
  return `file:///${path.replace(/\\/g, '/')}`
}

export function toAppFileUrl(path: string): string {
  return `appfile://local/${encodeURIComponent(path)}`
}
