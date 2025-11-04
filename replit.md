# Wevro - AI-Powered Mind-Map Vocabulary Learning

## Overview

Wevro is an educational web application that helps students learn English vocabulary through AI-generated mind maps and interactive flashcards. The application allows users to explore word relationships across multiple categories (synonyms, antonyms, derivatives, collocations, etc.) and practice vocabulary through swipe-based flashcards and spelling tests. The interface supports both English and Traditional Chinese, with design principles inspired by Linear's clean typography and Notion's organizational clarity.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build System**
- **React 18** with TypeScript for type-safe component development
- **Vite** as the build tool and development server with HMR support
- **Wouter** for lightweight client-side routing
- **Path aliases** configured for clean imports (@/, @shared/, @assets/)

**UI Component System**
- **shadcn/ui** components based on Radix UI primitives (configured in `components.json`)
- **Tailwind CSS** for utility-first styling with custom design tokens
- **Framer Motion** for animations and gesture-based interactions (swipe, drag)
- Design system follows "new-york" style variant with custom spacing and color scales

**State Management**
- **TanStack Query (React Query)** for server state management and data fetching
- **React Context** for global state (theme, language preferences)
- Local component state for UI interactions (mind map nodes, flashcard state)

**Key Features Implementation**
1. **Mind Map Canvas**: Interactive graph visualization with pan/zoom controls, drag-to-navigate functionality
2. **Flashcard System**: Swipe-based card interface with gesture recognition for "known/unknown" categorization
3. **Spelling Test**: Virtual keyboard interface with character-by-character input validation
4. **Bilingual Support**: i18n system with translations stored in `client/src/lib/i18n.ts`

### Backend Architecture

**Runtime & Framework**
- **Node.js** with **Express.js** for REST API server
- **TypeScript** throughout (ESM modules via `"type": "module"` in package.json)
- Development uses **tsx** for direct TypeScript execution
- Production build uses **esbuild** for server bundling

**API Design**
- RESTful endpoints under `/api` prefix
- Route definitions in `server/routes.ts`
- Request validation using **Zod** schemas from `shared/schema.ts`
- Response logging middleware for API calls

**Core API Endpoints**

*Dictionary & Translation System (November 2025 Refactor):*
1. `GET /api/dictionary/lookup/:word` - Full dictionary lookup with English + Chinese
   - Returns immediately with English definitions (Free Dictionary API)
   - Chinese translations complete in background (3-5 seconds)
   - Permanent PostgreSQL cache (zero cost on subsequent lookups)
2. `GET /api/dictionary/status/:word` - Check translation completion status
3. `GET /api/dictionary/queue-status` - Monitor background translation queue
4. `POST /api/generate-definition` - Legacy endpoint (backward compatible)
   - Returns English first, Chinese after background translation

*Other Endpoints:*
5. `POST /api/generate-words` - Generate related words for a category using AI
6. CRUD operations for mind maps and flashcard decks (in-memory storage)

### Data Storage Solutions

**Current Implementation: In-Memory Storage**
- `MemStorage` class in `server/storage.ts` implements `IStorage` interface
- Data stored in JavaScript Maps (non-persistent)
- UUID-based unique identifiers using `crypto.randomUUID()`

**Database Configuration (Active PostgreSQL)**
- **Drizzle ORM** with PostgreSQL via **Neon Database** (`@neondatabase/serverless`)
- Schema defined in `shared/schema.ts` using drizzle-zod for type safety
- **words** table in production for permanent dictionary caching
- Migration command: `npm run db:push` (or `--force` if needed)
- Upsert pattern prevents concurrent insert conflicts

**Data Models**
1. **MindMapNode**: Word nodes with position, parent relationships, categories
2. **Flashcard**: Word/definition pairs with learning status
3. **FlashcardDeck**: Collections of flashcards with metadata
4. **MindMap**: Complete mind map state with node arrays
5. **Word** (PostgreSQL): Permanent dictionary cache
   - lemma (PK): normalized word form
   - senses: JSON array with English + Traditional Chinese definitions
   - enReady/zhReady: status flags for immediate vs. background content
   - Handles concurrent lookups with upsert pattern (onConflictDoNothing)

**Schema Sharing Strategy**
- Schemas defined once in `shared/schema.ts` using Zod
- Shared between client and server via path alias `@shared/*`
- Type inference via `z.infer<>` ensures type safety across stack

### External Dependencies

**AI Integration**
- **OpenAI API** via Replit's AI Integrations service
- Model: GPT-4o (updated November 2025)
- Configured via environment variables:
  - `AI_INTEGRATIONS_OPENAI_BASE_URL`
  - `AI_INTEGRATIONS_OPENAI_API_KEY`
- **Strict Translation Mode**: AI only translates (never invents content)
- JSON mode with enforced response schema
- Background translation queue prevents UI blocking

**Dictionary Data Source**
- **Free Dictionary API** (dictionaryapi.dev) for English definitions
- Zero cost, no rate limits, authoritative sources
- Adapter layer in `server/dictionary-api.ts`

**Database Service**
- **Neon Database** (PostgreSQL-compatible serverless database)
- Connection string via `DATABASE_URL` environment variable
- WebSocket support via `@neondatabase/serverless` driver
- Session storage configured with `connect-pg-simple`

**Third-Party UI Libraries**
- **Radix UI** primitives for accessible components (accordion, dialog, dropdown, etc.)
- **Embla Carousel** for carousel/swipe functionality
- **cmdk** for command palette interface
- **Lucide React** for consistent iconography

**Font Services**
- **Google Fonts** for typography:
  - Inter (English primary)
  - Noto Sans TC (Traditional Chinese)
  - JetBrains Mono (monospace for spelling mode)
- Loaded via link tags in `client/index.html`

**Development Tools**
- **Replit-specific plugins** (vite-plugin-cartographer, vite-plugin-dev-banner, vite-plugin-runtime-error-modal)
- Enabled only in development mode and Replit environment

**Session Management**
- PostgreSQL session store via `connect-pg-simple`
- Session table managed automatically by the library
- Credentials handling via Express session middleware