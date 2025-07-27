# Brian's AI Assistant

A production-ready session-based AI chat application designed to provide information about Brian Fending's professional background and experience. Perfect for recruiters and potential collaborators.

## Features

- 🤖 **Smart AI Model Selection** - Automatic routing between Claude Haiku (fast/cheap) and Sonnet (complex) based on query analysis
- 📧 **Email-Based Sessions** - No persistent accounts, secure session links via email
- 🚦 **Smart Queue System** - 100 concurrent sessions with 20-person queue
- 🔒 **Multi-Layer Security** - reCAPTCHA v3, rate limiting, email suppression, disposable email blocking
- 📊 **Comprehensive Analytics** - Four core admin areas: Who's Chatting, What They're Asking, LLM Quality, Training Data
- 🎯 **Knowledge Base Management** - Priority-based content with admin curation interface
- 🔍 **Vector Search System** - OpenAI embeddings with PostgreSQL pgvector for semantic search
- 💰 **Cost Tracking** - Real-time AI API usage monitoring and budget controls
- ⏳ **Progressive Loader** - Humorous phase-based loading with abort functionality
- 🔄 **Training Interface** - Conversation curation for knowledge base improvement

## Tech Stack

- **Framework**: Next.js 15 with App Router + React 19
- **Database**: Supabase (PostgreSQL with RLS)
- **Authentication**: Email-based session tokens (no persistent accounts)
- **AI**: Anthropic Claude 3.5 Haiku/Sonnet with smart model selection (provider-agnostic architecture)
- **Email**: Postmark for transactional email delivery
- **Security**: reCAPTCHA v3, multi-layer rate limiting, email suppression
- **Vector Search**: PostgreSQL pgvector extension with OpenAI embeddings
- **Styling**: Tailwind CSS with design tokens
- **TypeScript**: Full type safety throughout
- **Deployment**: Vercel with cron jobs
- **Queue**: Custom session management with position tracking

## Quick Start

### Prerequisites

- Node.js 18+ installed
- A Supabase account and project
- An Anthropic Claude API key
- A Postmark account for email delivery
- reCAPTCHA v3 site and secret keys
- OpenAI API key (for embeddings)

### Setup

1. **Clone and install dependencies**
   ```bash
   git clone <your-repo-url>
   cd fending-gpt
   npm install
   ```

2. **Set up environment variables**
   ```bash
   cp .env.local.example .env.local
   # Edit .env.local with your actual values
   ```

3. **Set up Supabase database**
   - Create a new Supabase project
   - Apply schema files in order: `database/complete_schema.sql`
   - Enable Row Level Security (RLS) policies
   - Get your project URL, anon key, and service role key from Settings > API

4. **Configure email and security services**
   - Set up Postmark account for email delivery
   - Configure reCAPTCHA v3 for your domain
   - Add your email to `admin_users` table for admin access

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Set up admin access**
   - Insert your email into the `admin_users` table in Supabase
   - Access admin dashboard at `/admin` with your email session

### Environment Variables

Required environment variables (see `.env.local.example`):

**Core Integration:**
- `CLAUDE_API_KEY` - Anthropic Claude API key
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (admin operations)

**Email & Security:**
- `POSTMARK_SERVER_TOKEN` - Postmark email delivery
- `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` - reCAPTCHA v3 site key
- `RECAPTCHA_SECRET_KEY` - reCAPTCHA v3 secret key

**Application:**
- `NEXTAUTH_URL` - Base URL for email links
- `NEXTAUTH_SECRET` - Session security (generate with openssl rand -base64 32)
- `CRON_SECRET` - Vercel cron authentication secret
- `OPENAI_API_KEY` - OpenAI API for embeddings
- `ADMIN_EMAIL` - Admin email address
- `NEXT_PUBLIC_SITE_URL` - Public site URL

## Deployment to Vercel

1. **Connect your repository to Vercel**
   - Import your GitHub repository in Vercel
   - Vercel will automatically detect Next.js

2. **Configure environment variables**
   - Add all required environment variables in Vercel Dashboard
   - Update `NEXT_PUBLIC_SITE_URL` to your production domain
   - Update `NEXTAUTH_URL` to your production domain

3. **Configure production services**
   - Update reCAPTCHA settings for your production domain
   - Configure Postmark DKIM/SPF records for email delivery
   - Set up Vercel cron jobs (configured in `vercel.json`)

4. **Deploy**
   - Vercel will automatically deploy on every push to main branch

## Database Schema

**Core Tables:**
- `chat_sessions` - Email-based sessions with queue status and metadata
- `chat_messages` - Full conversation logs with AI metrics and cost tracking
- `knowledge_base` - Structured content with priority-based selection
- `training_conversations` - Curated examples with quality ratings
- `daily_budgets` - Cost monitoring and limits
- `admin_users` - Admin access control

**Security Tables:**
- `suppressed_emails` - Email blacklist/whitelist with expiration
- `rate_limits` - IP and email rate limiting with automatic blocking
- `email_events` - Postmark webhook event tracking
- `disposable_email_domains` - Blocked disposable email providers

**Legacy Tables** (kept for migration):
- `users`, `conversations`, `messages`, `usage_logs`

Row Level Security (RLS) prevents cross-user data access with service role bypass for admin operations.

## Vector Search & Knowledge Retrieval

The application uses a sophisticated vector search system to provide contextually relevant information about Brian's background:

### Architecture Overview

**Vector Embeddings Pipeline:**
1. **Content Processing** - Knowledge base entries are formatted with category, title, content, and tags
2. **Embedding Generation** - OpenAI's `text-embedding-3-small` model converts text to 1536-dimensional vectors
3. **Vector Storage** - Embeddings stored in PostgreSQL using pgvector extension
4. **Similarity Search** - Cosine similarity matching against user queries in real-time

### How It Works

**Query Processing:**
1. User asks a question about Brian's background
2. Question is converted to vector embedding using OpenAI API
3. PostgreSQL performs similarity search using `match_knowledge_entries` function
4. Results filtered by similarity threshold (default 0.7) and ranked by relevance
5. Category diversity algorithm ensures balanced information across experience, skills, projects, etc.

**Intelligent Context Selection:**
- **Semantic Matching** - Finds conceptually related information, not just keyword matches
- **Category Balancing** - Ensures representation from experience, skills, education, projects, company info, etc.
- **Priority Weighting** - Higher priority content gets preference when similarity scores are close
- **Fallback System** - Gracefully falls back to priority-based selection if vector search fails

**Performance Optimizations:**
- **Batch Processing** - Multiple embeddings generated efficiently in single API calls  
- **Caching** - Embeddings generated once and reused for all queries
- **Threshold Filtering** - Only retrieves sufficiently relevant matches (similarity > 0.7)
- **Result Limiting** - Configurable result counts prevent context overflow

### Database Integration

**pgvector Extension:**
```sql
-- Vector similarity search function
CREATE FUNCTION match_knowledge_entries(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 15
)
-- Returns ranked results by cosine similarity
```

**Knowledge Base Schema:**
- `embedding` column: `vector(1536)` - OpenAI embedding vectors
- `category` field: Structured categories (experience, skills, projects, etc.)
- `priority` field: Manual curation priority (1-10 scale)
- `is_active` flag: Enable/disable entries without deletion

### Cost Management

**Embedding Generation:**
- OpenAI text-embedding-3-small pricing: $0.00002 per 1K tokens (5x cheaper than ada-002)
- Embeddings generated once during knowledge base updates
- Batch processing minimizes API calls and costs

**Query Processing:**
- Each user query generates one embedding (~$0.00004 per query)
- Vector search performed locally in PostgreSQL (no additional API costs)
- Efficient similarity calculations using optimized pgvector operations

### Administrative Features

**Embedding Management:**
- **Auto-Generation** - New knowledge base entries automatically get embeddings
- **Bulk Processing** - Admin interface for regenerating all embeddings
- **Quality Monitoring** - Track embedding generation success/failure rates
- **Cost Tracking** - Monitor OpenAI API usage for embedding operations

**Search Analytics:**
- **Query Performance** - Track search response times and result quality
- **Similarity Metrics** - Monitor average similarity scores and threshold effectiveness
- **Fallback Frequency** - Measure how often fallback to priority-based search occurs
- **Category Distribution** - Analyze which content categories are most relevant to user queries

## Smart Model Selection

The application automatically routes queries to the most cost-effective AI model based on complexity analysis:

### How It Works

**Query Analysis:**
1. **Content Analysis** - Examines query length, complexity indicators, and technical terms
2. **Intent Classification** - Identifies simple factual questions vs. complex analytical requests
3. **Model Recommendation** - Routes to Haiku (fast/cheap) or Sonnet (detailed/complex)
4. **Fallback Protection** - Automatically retries with default model if recommended model fails

**Classification Heuristics:**
- **Simple → Haiku**: Short factual questions, basic info requests, simple "what/when/where" queries
- **Complex → Sonnet**: Strategic analysis, detailed explanations, multi-part questions, technical depth

**Cost Impact:**
- **Haiku**: $0.25/$1.25 per 1M tokens (input/output) - 12x cheaper than Sonnet
- **Sonnet**: $3/$15 per 1M tokens (input/output) - Higher quality for complex queries
- **Automatic Optimization**: Potential 60-80% cost savings on simple queries

**Quality Assurance:**
- Confidence scoring for classification decisions
- Detailed reasoning logs for admin monitoring
- Graceful fallback to premium model on any errors
- Real-time metrics tracking for both models

## Admin Features

Admin users (in `admin_users` table) can access comprehensive dashboard with tabs:

- **Statistics** - Usage analytics, cost tracking, system health
- **Users** - Unique users with aggregated session data
- **Sessions** - Individual session details and conversation logs
- **Training** - Conversation curation and quality rating interface
- **Knowledge Base** - Content management with priority-based selection
- **Suppression Management** - Email blacklist/whitelist and rate limit controls

**Four Core Analytics Areas:**
- **(A) Who's Chatting** - User emails, companies, session details
- **(B) What They're Asking** - Question categorization and frequency
- **(C) LLM Response Quality** - Confidence scores, response times
- **(D) Training Data** - Conversation curation for knowledge improvement

## API Endpoints

**Session Management:**
- `POST /api/session/request` - Request new session via email (with reCAPTCHA + security)
- `GET /api/session/start` - Activate session from email link
- `GET /api/session/queue-status` - Check queue position and wait time

**Chat System:**
- `POST /api/chat` - AI integration with knowledge base context and streaming
- `POST /api/chat/stream` - Streaming chat responses with loader support

**Admin Dashboard:**
- `GET /api/admin/stats` - Usage analytics and system metrics
- `GET /api/admin/users` - Unique users with aggregated data
- `GET /api/admin/sessions` - Individual session details
- `GET|PATCH /api/admin/training` - Conversation curation interface
- `GET|POST /api/admin/knowledge` - Knowledge base management
- `POST /api/admin/embeddings/generate` - Generate vector embeddings for knowledge base
- `GET|POST|DELETE /api/admin/suppressions` - Email suppression management

**Security & Automation:**
- `POST /api/webhooks/postmark` - Handle email bounces and complaints
- `GET /api/cron/garbage-collect` - Session cleanup (daily 12:01 AM ET)
- `GET /api/health` - System health check

## Development

### Project Structure

```
src/
├── app/                 # Next.js app router pages
│   ├── admin/          # Admin dashboard page
│   ├── api/            # API routes
│   ├── chat/           # Chat interface page
│   ├── privacy/        # Privacy policy page
│   └── page.tsx        # Landing page (SessionStart)
├── components/          # React components
│   ├── admin/          # Admin dashboard (6 main tabs)
│   ├── auth/           # Email-based session authentication
│   ├── chat/           # Chat interface with streaming
│   ├── layout/         # Header and navigation
│   └── ui/             # Reusable UI primitives
├── lib/                # Core business logic
│   ├── ai/             # Provider factory pattern
│   ├── auth/           # Session-based authentication
│   ├── security/       # Rate limiting, reCAPTCHA, email validation
│   ├── supabase/       # Database clients (browser/server/service)
│   └── utils/          # Shared utilities
└── types/              # TypeScript definitions
database/               # Schema and migrations
```

### Key Components

**Session Management:**
- `SessionStart` - Email collection with reCAPTCHA and queue integration
- `QueueStatus` - Real-time queue position and wait time updates
- `SessionChatInterface` - Main chat interface with session validation

**Chat System:**
- `ChatLoader` - Progressive loader with humorous phases and abort functionality
- `StreamingMessage` - Real-time AI response streaming
- `ChatInput` - Message composition with validation

**Admin Dashboard:**
- `AdminDashboard` - Main admin layout with 6 tabs
- `AdminStats` - Statistics and analytics with cost tracking
- `TrainingInterface` - Conversation curation and knowledge extraction
- `KnowledgeBase` - Content management with priority-based selection
- `SuppressionManagement` - Email blacklist/whitelist and rate limit controls

**AI Integration:**
- `AIProviderFactory` - Swappable AI provider architecture with model variants
- `ClaudeProvider` - Supports both Haiku and Sonnet models with cost tracking
- `AIService` - Smart model selection with complexity analysis and fallback logic
- `QueryAnalyzer` - Intelligent routing between models based on query characteristics
- `RAGService` - Vector search and knowledge retrieval system
- `OpenAIEmbeddingService` - Embedding generation and cost management

## Roadmap

### Near Term
- ✅ **Cost Optimization**: Added Claude 3.5 Haiku for simple queries, Sonnet for complex ones
- ✅ **Embedding Upgrade**: Migrated to OpenAI text-embedding-3-small for better performance and lower costs  
- ✅ **Streaming UX**: Enhanced token-by-token display with word boundaries and smart timing
- **Response Caching**: Cache common questions to reduce API costs

### Future Considerations
- **Mobile Optimization**: PWA features for better mobile experience
- **Advanced Analytics**: Query pattern analysis and response quality improvements

### Explicitly Not Planned
- Complex agentic workflows (overkill for personal background Q&A)
- Multiple reranking layers (unnecessary complexity for curated knowledge base)
- Function calling (no clear use case for this domain)
- Hybrid search (vector search sufficient for personal background content)

## Contributing  

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Key Development Commands

```bash
npm run dev          # Start development server with Turbopack
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint and type checking
```

## Vercel Cron Configuration

- **Schedule**: Daily at 12:01 AM ET (5:01 AM UTC)
- **Authentication**: Uses `CRON_SECRET` environment variable
- **Function**: Session cleanup and queue management
- **Configuration**: Defined in `vercel.json`

## Architecture Highlights

- **Provider Agnostic**: Swappable AI providers via factory pattern
- **Session Based**: No persistent user accounts, email-based access
- **Security First**: Multi-layer protection with graceful degradation
- **Cost Conscious**: Real-time tracking and budget controls
- **Admin Focused**: Comprehensive analytics for business insights
- **Queue Managed**: Scalable concurrent session handling
- **Training Ready**: Built-in conversation curation for AI improvement

## Support

For support, please email hello@brianfending.com or create an issue in the repository.