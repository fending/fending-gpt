# CLAUDE.md

Guidance for Claude Code in the fending-gpt project.

## Overview

AI chat assistant at ai.brianfending.com. Helps recruiters learn about Brian's background. Provider-agnostic design with session management, admin dashboard, and training interface.

**Stack**: Next.js 15 (App Router), React 19, TypeScript, Supabase, Anthropic Claude SDK

## Commands

```bash
npm run dev      # Development server (Turbopack)
npm run build    # Production build
npm run lint     # ESLint and type checking
```

## Structure

- `src/app/` - Pages and API routes (chat, admin, session, cron)
- `src/components/` - Admin, auth, chat, and UI components
- `src/lib/ai/` - Provider abstraction (ClaudeProvider, RAGService, factory)
- `src/lib/supabase/` - Database clients (server + browser)
- `src/types/` - TypeScript definitions
- `database/` - Schema (`complete_schema.sql`)
- `context/` - Extended documentation

## Key Patterns

- **AI Provider Factory**: Swappable providers via `getAIProvider()`
- **Supabase Clients**: Browser client for components, server client for API routes
- **Admin Access**: Service role key bypasses RLS for admin operations
- **Security Layers**: reCAPTCHA → IP rate limiting → Email rate limiting → Suppression

## Database Tables

Core: `chat_sessions`, `chat_messages`, `knowledge_base`, `training_conversations`

Security: `suppressed_emails`, `rate_limits`, `email_events`, `disposable_email_domains`

## Guidelines

- Use typed Supabase clients from `/lib/supabase/`
- All AI interactions through factory pattern
- Admin routes require `admin_users` verification
- 5-minute auth caching reduces DB calls ~85%

## Documentation

See `/context/` for implementation status, architecture patterns, and development guidelines.
