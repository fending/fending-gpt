# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Vision & Context

**Original Intent**: Professional AI assistant for `ai.brianfending.com` - a model-agnostic career assistant with rapid deployment and future flexibility to help recruiters learn about Brian's background.

**Current State**: Production-ready session-based AI chat application with comprehensive security, email authentication, admin dashboard, training interface, and smart progressive loading system - fully aligned with original vision.

### Core Architecture Philosophy
**Provider Agnostic Design** - The application works identically whether powered by Claude, OpenAI, local LLaMA, or future models.

### Key Architectural Patterns from Original Vision

**AI Provider Abstraction** (✅ Implemented):
```typescript
interface AIProvider {
  name: string;
  model: string;
  maxTokens: number;
  costPerToken: { input: number; output: number };
  generateResponse(messages: ChatMessage[], options?: GenerationOptions): Promise<AIResponse>;
  estimateCost(messages: ChatMessage[]): Promise<number>;
  validateConfig(): boolean;
  isHealthy(): Promise<boolean>;
}
```

**Four Core Admin Analytics Areas** (✅ Implemented):
- **(A) Who's Chatting**: User emails, companies, session details - Users & Sessions tabs
- **(B) What They're Asking**: Question categorization and frequency - Training tab analytics  
- **(C) LLM Response Quality**: Confidence scores, response times - Statistics dashboard
- **(D) Training Data**: Curate conversations for knowledge base improvement - Training interface

### ✅ Implemented Features
- **AI Provider Factory Pattern** with swappable providers (`/src/lib/ai/`) including confidence scoring and cost estimation
- **Multi-layer Security System** with reCAPTCHA v3, dual rate limiting (IP/Email), email suppression, disposable email blocking
- **Email-based session authentication** with token-based access, Postmark integration, and webhook automation
- **Smart Progressive Loader** with humorous phase-based messaging, minimum display time, and abort functionality with prompt repopulation
- **Knowledge Base Management** with dedicated tab, search/filter, CRUD operations, and "Suggest for Knowledge Base" workflow
- **Vector Search System** with OpenAI embeddings, PostgreSQL pgvector, semantic similarity matching, and intelligent context selection
- **Admin Training Interface** with conversation curation, quality rating, intelligent categorization, and knowledge extraction
- **Session Analytics** with comprehensive tracking, cost monitoring, detailed dashboards, and four core analytics areas (A, B, C, D)
- **Admin Dashboard** with Statistics, Users, Sessions, Training, Knowledge Base, and Suppression Management tabs
- **Optimized Auth Middleware** with 5-minute caching reducing database calls by ~85% while maintaining security
- **Smart Queue System** (100 concurrent, 20 max queue) with position tracking and estimated wait times
- **Bidirectional Navigation** between Chat and Admin interfaces with real-time admin privilege checking

### 🚧 Remaining Features (Nice-to-Have)
- **Real-time Queue Updates** for live position changes
- **Advanced Context Management** with semantic search and token optimization
- **Budget Enforcement System** with daily/monthly limits and automatic throttling

## Development Commands

### Core Commands
```bash
npm run dev          # Start development server with Turbopack
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint and type checking
```

### Database Setup
```bash
# Apply comprehensive schema to Supabase project
# See database/README.md for complete setup instructions
# Apply database/complete_schema.sql in Supabase SQL editor
# Creates core tables: chat_sessions, chat_messages, knowledge_base, training_conversations, daily_budgets, admin_users
# Creates security tables: suppressed_emails, rate_limits, email_events, disposable_email_domains
# Includes RLS policies and optimized indexes
```

### Environment Variables Required
```bash
# Core AI Integration
CLAUDE_API_KEY=                    # Anthropic Claude API key

# Database
NEXT_PUBLIC_SUPABASE_URL=         # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=    # Supabase anon/public key
SUPABASE_SERVICE_ROLE_KEY=        # Supabase service role key (admin operations)

# Email & Security
POSTMARK_SERVER_TOKEN=            # Postmark email delivery
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=   # reCAPTCHA v3 site key
RECAPTCHA_SECRET_KEY=             # reCAPTCHA v3 secret key

# Application
NEXTAUTH_URL=                     # Base URL for email links
NEXTAUTH_SECRET=                  # Session security (generate with openssl rand -base64 32)
CRON_SECRET=                      # Vercel cron authentication secret

# Additional Services
OPENAI_API_KEY=                   # OpenAI API key for embeddings
ADMIN_EMAIL=                      # Admin email address
NEXT_PUBLIC_SITE_URL=             # Public site URL
```

## Architecture Overview

### Technology Stack
- **Frontend**: Next.js 15 (App Router) + React 19 + TypeScript
- **Backend**: Next.js API routes + Supabase (PostgreSQL + Auth)  
- **AI**: Anthropic Claude 3.5 Sonnet via official SDK
- **Styling**: Tailwind CSS with design tokens

### Core Data Flow
1. **Authentication**: Email-based session tokens (no persistent accounts)
2. **Queue Management**: Session capacity control with queue position tracking
3. **Chat Flow**: User message → Database → AI Provider → Assistant response → Database
4. **Cost Tracking**: All AI API calls logged with token usage and costs
5. **Training Loop**: Conversations → Admin review → Knowledge base extraction
6. **Security**: Row Level Security (RLS) + Admin service role access

### Database Schema

**Core Tables** (✅ Implemented):
- **chat_sessions**: Email-based sessions with queue status, user tracking, metadata
- **chat_messages**: Full conversation logs with question categorization, confidence scores, cost tracking
- **knowledge_base**: Structured content (resume, projects, skills, experience, personal, company) with priority-based selection
- **training_conversations**: Curated examples with quality ratings and knowledge extraction
- **daily_budgets**: Cost monitoring and limits with automatic throttling
- **admin_users**: Admin access control list

**Security Tables** (✅ Implemented):
- **suppressed_emails**: Email blacklist/whitelist with expiration support
- **rate_limits**: IP and email rate limiting with automatic blocking
- **email_events**: Postmark webhook event tracking (bounces, complaints)
- **disposable_email_domains**: Blocked disposable email providers

**Legacy Tables** (📦 Kept for migration):
- **users**: Original authentication system
- **conversations**: Original chat session metadata  
- **messages**: Original message storage
- **usage_logs**: Original cost tracking

## Key Architecture Patterns

### Authentication System (✅ Implemented)
- **Session Flow**: Email → Token → Active session (no passwords)
- **Queue Management**: 5 concurrent sessions, 20 max queue with position tracking
- **Client**: `/lib/supabase/client.ts` for browser-side operations
- **Server**: `/lib/supabase/server.ts` for API routes (+ service role for admin)
- **Admin Access**: `admin_users` table controls admin route access
- **Email Service**: Postmark integration for session link delivery

### AI Provider Integration (✅ Implemented)
- **Architecture**: Provider factory pattern in `/src/lib/ai/`
- **Current Provider**: ClaudeProvider using official Anthropic SDK
- **Model**: claude-3-5-sonnet-20241022 (4000 max tokens)
- **Cost Calculation**: $3/1M input tokens, $15/1M output tokens
- **Context**: Knowledge base + conversation history sent with each request
- **Features**: Cost estimation, confidence scoring, response quality tracking, health checks
- **Swappable**: Ready for OpenAI, local models via provider interface

### Component Organization (✅ Implemented)
```
components/
├── admin/              # Admin dashboard components
│   ├── AdminDashboard.tsx     # Main admin layout with tabs
│   ├── AdminStats.tsx         # Statistics and analytics
│   ├── UsersList.tsx          # Unique users management
│   ├── SessionsList.tsx       # Individual sessions view
│   ├── TrainingInterface.tsx  # Conversation curation & knowledge extraction
│   ├── KnowledgeBase.tsx      # Dedicated knowledge management
│   └── SuppressionManagement.tsx # Email suppression & rate limit controls
├── auth/               # Session authentication
│   └── SessionStart.tsx       # Email collection + queue status with reCAPTCHA
├── chat/               # Main chat interface
│   ├── SessionChatInterface.tsx # Session-based chat with loader integration
│   ├── ChatMessage.tsx         # Individual message display
│   ├── ChatInput.tsx           # Message composition
│   └── ChatLoader.tsx          # Smart progressive loader with abort
└── ui/                 # Reusable UI primitives
```

### API Routes (✅ Implemented)
**Session Management**:
- `POST /api/session/request` - Request new session via email (with reCAPTCHA + multi-layer security)
- `GET /api/session/start` - Activate session from email link

**Chat System**:
- `POST /api/chat` - AI integration with knowledge base context and loader support

**Admin Dashboard**:
- `GET /api/admin/stats` - Usage analytics and metrics
- `GET /api/admin/users` - Unique users with aggregated data
- `GET /api/admin/sessions` - Individual session details
- `GET|PATCH /api/admin/training` - Conversation curation
- `GET|POST /api/admin/knowledge` - Knowledge base management
- `GET|POST|DELETE /api/admin/suppressions` - Email suppression management
- `GET|DELETE /api/admin/rate-limits` - Rate limit management

**Security Webhooks**:
- `POST /api/webhooks/postmark` - Handle email bounces and complaints

**Vercel Cron Jobs**:
- `GET /api/cron/garbage-collect` - Session cleanup and queue management (runs daily at 12:01 AM ET)

## Development Guidelines

### Working with Supabase
- **Client Usage**: Typed clients from `/lib/supabase/` - server client for API routes, browser client for components
- **Authentication**: Session APIs use anon key, admin APIs use service role key with shared auth middleware
- **Security**: All database operations respect RLS policies, admin routes use optimized auth middleware with caching
- **Performance**: Use shared `validateSession()` middleware to reduce database calls by ~85%
- **Admin Access**: Admin routes verify `admin_users` table membership on every request

### AI Provider Integration
- **Architecture**: Use provider factory pattern from `/src/lib/ai/` for swappable AI providers
- **Usage Tracking**: Always log usage to `chat_messages` table with token counts, costs, and confidence scores
- **Context Management**: Include knowledge base context + conversation history in AI requests via RAG system
- **Vector Search**: Use `RAGService` for semantic knowledge retrieval with OpenAI embeddings and pgvector similarity search
- **Error Handling**: Implement graceful error handling with user-friendly messages and loader abort functionality
- **Quality Tracking**: Track confidence scores, response times, and costs for training and optimization

### Security Implementation
- **Multi-layer Approach**: Implement defense in depth - reCAPTCHA → IP rate limiting → Email rate limiting → Suppression checking → Disposable email blocking
- **Rate Limiting**: Use generous IP limits (20/hour, 50/day) and strict email limits (3/hour, 10/day)
- **Email Security**: Implement automatic suppression via Postmark webhooks for bounces and complaints
- **Caching Strategy**: Use 5-minute auth caching to optimize performance while maintaining security
- **Fail-Open Design**: Security layers fail gracefully to maintain user experience

### Security Considerations
- **Multi-layer Security**: reCAPTCHA v3 → IP rate limiting → Email rate limiting → Suppression checking → Disposable email blocking
- **Rate Limiting**: IP (generous: 20/hour, 50/day) and Email (strict: 3/hour, 10/day)
- **Email Suppression**: Blacklist/whitelist with automatic Postmark webhook integration
- **Optimized Auth**: Shared middleware with 5-minute caching reduces database calls by ~85%
- **RLS Policies**: Prevent cross-user data access with service role bypass for admin operations
- **Admin Verification**: All admin routes verify `is_admin` status on every request
- **Environment Security**: Sensitive keys handled via environment variables
- **Input Validation**: All user-submitted content validated and sanitized

### Vercel Cron Configuration
- **Schedule**: Daily at 12:01 AM ET (5:01 AM UTC) - `1 5 * * *`
- **Configuration**: Defined in `vercel.json` crons array
- **Authentication**: Uses `CRON_SECRET` environment variable for security
- **Hobby Plan Compatible**: Daily cron jobs are allowed on Vercel Hobby plans
- **Session Limits**: Supports up to 100 concurrent sessions
- **Manual Trigger**: Can be manually triggered via `/api/cron/garbage-collect` with proper authentication

### State Management
- Local component state for UI interactions
- Database as source of truth for persistent data
- No global state management - architecture stays simple
- Real-time updates via Supabase when needed

### TypeScript Types
- Core types in `/src/types/index.ts`
- Database types generated from Supabase schema
- API response types for Claude integration
- Component prop types for better development experience

## Implementation Roadmap

### Phase 1: AI Provider Abstraction (Weeks 1-2)
1. **Provider Interface & Factory**
   - Create `AIProvider` interface with standardized methods
   - Build provider factory pattern for swappable providers
   - Implement Claude provider as first implementation
   - Add cost estimation and response quality tracking

2. **Enhanced Database Schema**
   - Create `chat_sessions` table with email/queue support
   - Enhance `chat_messages` with confidence scores and categorization
   - Add `knowledge_base` table with priority-based content
   - Implement `training_conversations` for curation

3. **Session Management Foundation**
   - Optional email collection (not required)
   - Session-based authentication (no persistent accounts)
   - Basic queue system implementation
   - Cost tracking per session

### Phase 2: Professional Features (Weeks 3-4)
1. **Smart Context Management**
   - Priority-based knowledge selection for AI context
   - Token budget management and optimization
   - Conversation summarization for long sessions
   - Semantic search for relevant knowledge entries

2. **Admin Analytics Dashboard**
   - **(A) Who's Chatting**: User tracking with company/recruiter identification
   - **(B) What They're Asking**: Question categorization and frequency analysis
   - **(C) LLM Response Quality**: Confidence scoring and response time tracking
   - **(D) Training Data**: Conversation curation and knowledge extraction

3. **Cost Control & Queue Management**
   - Daily/monthly budget limits with automatic throttling
   - Smart queue system (100 concurrent, 20 max queue)
   - Real-time cost monitoring and alerts
   - Session lifecycle management

### Phase 3: Advanced Features (Weeks 5-6)
1. **Multi-Provider Support**
   - OpenAI provider implementation
   - Local model provider framework
   - A/B testing between providers
   - Provider performance comparison

2. **Knowledge Base Management**
   - Admin interface for content editing
   - Automated knowledge extraction from conversations
   - Training conversation curation workflow
   - Content categorization and tagging

## Common Development Tasks

### Working Toward Original Vision

**Priority 1: AI Provider Abstraction**
1. Create `lib/ai/providers/` directory with `AIProvider` interface
2. Implement `ClaudeProvider` class with standardized methods
3. Build `AIProviderFactory` for provider switching
4. Add confidence scoring and cost estimation to responses

**Priority 2: Enhanced Session & Analytics**
1. Replace current auth with optional email collection
2. Implement session-based chat (no persistent accounts)
3. Add the four core analytics tracking areas (A, B, C, D)
4. Create admin dashboard for conversation insights

**Priority 3: Professional Features**
1. Build knowledge base system with Brian's career information
2. Implement smart context management and token optimization
3. Add queue system for concurrent session management
4. Create training conversation curation workflow

### Current System Development
1. Update database schema in `schema.sql`
2. Update TypeScript types in `/src/types/`
3. Modify components for UI changes
4. Update API routes for backend logic
5. Test with RLS policies for security

### Database Changes
1. Update `schema.sql` with new tables/columns
2. Apply changes in Supabase SQL editor
3. Update TypeScript types to match schema
4. Add appropriate RLS policies for new tables
5. Update relevant components and API routes