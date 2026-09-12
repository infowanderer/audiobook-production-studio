# Audiobook Production Studio

A desktop-oriented web application for transforming ebooks into production-ready audiobook source material.

## What It Does (Milestone 1)

- **Import EPUBs** — upload an EPUB file; the app validates it, extracts its chapters, and builds a structured internal representation.
- **Deterministic cleanup** — automatically detects and removes common ebook artifacts (page numbers, repeated headers/footers, excess whitespace, invisible Unicode characters) using a configurable set of independent rules.
- **Side-by-side review** — compare original text against cleaned text for every chapter, accept or reject changes, and manually edit anything the automation got wrong.
- **Project persistence** — every project saves to the database automatically. Close the browser, come back, and pick up where you left off.
- **Export** — export the cleaned book as plain text files, structured HTML, or both, with per-chapter files and a combined file.

## Architecture

```
src/
├── processing/           # "Backend" processing layer (clean boundary)
│   ├── document/         # Internal document model (Book → Chapter → Node)
│   ├── epub/             # EPUB parsing and validation
│   ├── cleanup/          # Deterministic cleanup engine + rules
│   │   └── rules/        # Individual cleanup rules (standalone modules)
│   └── export/           # TXT and HTML exporters
├── providers/            # Future provider interfaces (not implemented)
│   ├── tts/              # TTSProvider interface
│   ├── ai/               # AIProvider interface
│   └── voice/            # VoiceProfile interface
├── project/              # Project management (CRUD, Supabase persistence)
├── hooks/                # React hooks (useProject)
├── components/           # UI layer
│   ├── layout/           # App shell, sidebar, toolbar, status bar
│   ├── project/          # Project home / creation
│   ├── review/           # Side-by-side review panel
│   ├── cleanup/          # Cleanup settings dialog
│   └── export/           # Export dialog
└── lib/                  # Supabase client
```

### Key Design Decisions

1. **Processing layer is isolated from UI.** All EPUB parsing, document modeling, cleanup logic, and export code lives in `src/processing/` with zero React dependencies. This boundary exists so the processing layer can be extracted to a Python backend in a later milestone without touching the UI.

2. **Pipeline architecture.** The cleanup engine applies rules sequentially: Import → Extraction → Normalization → Cleanup → Review → Export. Each stage has clear inputs and outputs. Future stages (AI Enhancement, TTS, Audio Processing, M4B Production) have obvious insertion points.

3. **Every change is tracked.** Each cleanup operation records what rule triggered it, the original text, the replacement, the location, and a confidence level. Nothing is silently deleted.

4. **Rules are independent modules.** Each cleanup rule is a standalone module implementing a `CleanupRule` interface. Adding a new rule requires creating one file and registering it — no changes to the engine.

5. **Provider interfaces are ready.** `TTSProvider`, `AIProvider`, and `VoiceProfile` interfaces are defined. Milestone 2+ can implement `ElevenLabsProvider`, `OllamaProvider`, etc. against these interfaces without restructuring.

## Internal Document Model

The app doesn't work with raw EPUB HTML. Instead, it converts content to a normalized tree:

```
Book
├── Chapter
│   ├── Heading
│   ├── Paragraph
│   │   ├── Text
│   │   ├── Emphasis
│   │   └── Strong
│   ├── Blockquote
│   ├── SceneBreak
│   └── FootnoteRef
```

This model is serializable (stored as JSON in the database), renderable to both plain text and HTML, and independent of any specific ebook format.

## Cleanup Rules

| Rule | What It Does |
|------|--------------|
| `standalone_page_number` | Removes paragraphs containing only a page number |
| `repeated_header` | Detects and removes running headers at chapter starts |
| `repeated_footer` | Detects and removes running footers at chapter ends |
| `whitespace_normalization` | Collapses excessive spaces/tabs within text |
| `line_break_normalization` | Removes excessive blank paragraphs |
| `unicode_normalization` | Removes invisible Unicode (BOM, zero-width spaces, soft hyphens), converts non-breaking spaces |

All rules can be independently enabled/disabled via the Cleanup Settings dialog.

## Database Schema

Three tables in Supabase:

- **projects** — metadata, status, cleanup configuration, export settings
- **chapters** — per-chapter content (original and cleaned), review status, processing metadata
- **cleanup_changes** — individual tracked changes with rule ID, original/replacement text, confidence, and accept/reject status

## Adding Future Providers

### TTS Provider

```typescript
// Implement the TTSProvider interface in src/providers/tts/
export interface TTSProvider {
  id: string;
  name: string;
  isAvailable(): Promise<boolean>;
  synthesize(text: string, voice: VoiceConfig): Promise<ArrayBuffer>;
  listVoices(): Promise<VoiceInfo[]>;
}
```

### AI Provider

```typescript
// Implement the AIProvider interface in src/providers/ai/
export interface AIProvider {
  id: string;
  name: string;
  isAvailable(): Promise<boolean>;
  analyze(text: string, prompt: string, options?: AIRequestOptions): Promise<AIResponse>;
}
```

### Voice Profiles

The `VoiceProfile` type in `src/providers/voice/types.ts` defines the shape of a complete voice configuration (provider, voice ID, speed, stability, style, pronunciation dictionary) for reproducible audiobook production.

## Demo Book

The app includes a built-in synthetic EPUB ("The Clockmaker's Apprentice") specifically designed to exercise the cleanup system. It contains:

- Standalone page numbers (1, 2, 47, 103)
- Repeated running headers ("THE CLOCKMAKER'S APPRENTICE")
- A repeated running footer ("THE CLOCKMAKER'S APPRENTICE — PAGE 63")
- Smart quotes and em-dashes
- Non-breaking spaces and zero-width spaces
- Soft hyphens
- Excessive blank paragraphs
- Excessive whitespace within text
- Dialogue, italics, bold, block quotes
- Scene breaks
- Footnote references
- Six chapters with varied structural patterns

Click "Try Demo Book" on the home screen to import it.

## Development

This is a Vite + React + TypeScript project.

```bash
npm install
npm run dev
```

### Type checking

```bash
npm run typecheck
```

### Build

```bash
npm run build
```

## Technology

- **Frontend:** React 18, TypeScript, Tailwind CSS, Lucide icons
- **Backend/Storage:** Supabase (PostgreSQL)
- **EPUB parsing:** JSZip (client-side)
- **Build:** Vite
