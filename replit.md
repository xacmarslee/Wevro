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
1. `POST /api/generate-words` - Generate related words for a category using AI
2. `POST /api/generate-definition` - Generate Traditional Chinese definitions
3. CRUD operations for mind maps and flashcard decks (in-memory storage)

### Data Storage Solutions

**Current Implementation: In-Memory Storage**
- `MemStorage` class in `server/storage.ts` implements `IStorage` interface
- Data stored in JavaScript Maps (non-persistent)
- UUID-based unique identifiers using `crypto.randomUUID()`

**Database Configuration (Drizzle ORM Ready)**
- **Drizzle ORM** configured with PostgreSQL dialect (`drizzle.config.ts`)
- Schema defined in `shared/schema.ts` using Zod (ready for drizzle-zod conversion)
- Connection expects **Neon Database** via `@neondatabase/serverless`
- Migration directory: `./migrations`
- Push command: `npm run db:push`

**Data Models**
1. **MindMapNode**: Word nodes with position, parent relationships, categories
2. **Flashcard**: Word/definition pairs with learning status
3. **FlashcardDeck**: Collections of flashcards with metadata
4. **MindMap**: Complete mind map state with node arrays

**Schema Sharing Strategy**
- Schemas defined once in `shared/schema.ts` using Zod
- Shared between client and server via path alias `@shared/*`
- Type inference via `z.infer<>` ensures type safety across stack

### External Dependencies

**AI Integration**
- **OpenAI API** via Replit's AI Integrations service
- Model: GPT-5 (as specified in `server/openai.ts`)
- Configured via environment variables:
  - `AI_INTEGRATIONS_OPENAI_BASE_URL`
  - `AI_INTEGRATIONS_OPENAI_API_KEY`
- JSON mode enabled for structured responses

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