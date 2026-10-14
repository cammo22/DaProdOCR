<!-- discord-card -->
<p align="center">
  <a href="https://discord.gg/Njs52aacwq"><img src=".github/discord-card.svg" alt="Entra nella community DaProd su Discord" width="720"></a>
</p>

# DaProdOCR

[![Discord](https://img.shields.io/badge/Discord-DaProd-5865F2?logo=discord&logoColor=white)](https://discord.gg/Njs52aacwq)

App desktop (Electron) per l'OCR locale di documenti scansionati, con motore basato su [Ollama](https://ollama.com) e una libreria dei documenti in stile [paperless-ngx](https://github.com/paperless-ngx/paperless-ngx).

Tutto gira in locale: nessun documento lascia il tuo computer.

## Funzionalità

- **OCR locale via Ollama** — elabora immagini/scansioni con un modello vision installato localmente, nessuna API esterna.
- **Generazione PDF ricercabili** — le pagine elaborate vengono unite in un PDF con testo selezionabile.
- **Libreria documenti** — archivio con anteprime, raggruppamento per giorno e ricerca full-text (SQLite + FTS5).
- **Anteprima rapida** — click sulla miniatura per un ingrandimento senza dover aprire il PDF.
- **Esportazione ed eliminazione** — esporta il PDF dove vuoi o elimina definitivamente un documento (file inclusi).
- **Impostazioni configurabili** — host/porta Ollama, modello da usare, prompt OCR e cartella di output.

## Stack tecnico

- [Electron](https://www.electronjs.org/) + [electron-vite](https://electron-vite.org/)
- React 19 + TypeScript
- better-sqlite3 (con FTS5) per la libreria documenti
- pdf-lib / pdfjs-dist per la generazione e lettura dei PDF
- Ollama per l'inferenza OCR locale

## Requisiti

- [Node.js](https://nodejs.org/) 20+
- [pnpm](https://pnpm.io/)
- [Ollama](https://ollama.com) installato e in esecuzione, con un modello vision scaricato (es. `glm-ocr:latest` o simili)

## Sviluppo

```bash
pnpm install
pnpm dev
```

## Build

```bash
# Solo build (senza pacchettizzare)
pnpm build

# Build + pacchetto Windows (installer NSIS + versione portable)
pnpm build:win
```

Gli eseguibili vengono generati nella cartella `release/`.

## Download

Le versioni pronte all'uso (installer `.exe` e versione portable) sono disponibili nella sezione [Releases](../../releases) di questo repository.

## Licenza

Progetto privato, uso interno.
