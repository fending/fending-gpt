# Brian's AI Assistant

A production-ready session-based AI chat application designed to provide information about Brian Fending's professional background and experience. Perfect for recruiters and potential collaborators.

## Features

- 🤖 **AI Provider Abstraction** - Swappable AI providers (currently Claude 3.5 Sonnet)
- 📧 **Email-Based Sessions** - No persistent accounts, secure session links via email
- 🚦 **Smart Queue System** - 100 concurrent sessions with 20-person queue
- 🔒 **Multi-Layer Security** - reCAPTCHA v3, rate limiting, email suppression, disposable email blocking
- 📊 **Comprehensive Analytics** - Four core admin areas: Who's Chatting, What They're Asking, LLM Quality, Training Data
- 🎯 **Knowledge Base Management** - Priority-based content with admin curation interface
- 💰 **Cost Tracking** - Real-time AI API usage monitoring and budget controls
- ⏳ **Progressive Loader** - Humorous phase-based loading with abort functionality
- 🔄 **Training Interface** - Conversation curation for knowledge base improvement

## Tech Stack

- **Framework**: Next.js 15 with App Router + React 19
- **Database**: Supabase (PostgreSQL with RLS)
- **Authentication**: Email-based session tokens (no persistent accounts)
- **AI**: Anthropic Claude 3.5 Sonnet (provider-agnostic architecture)
- **Email**: Postmark for transactional email delivery
- **Security**: reCAPTCHA v3, multi-layer rate limiting, email suppression
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
- `AIProviderFactory` - Swappable AI provider architecture
- `ClaudeProvider` - Current Claude 3.5 Sonnet implementation with cost tracking

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