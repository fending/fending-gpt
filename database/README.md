# Database Setup

This directory contains all database schema files and migrations for the fending-gpt application.

## Directory Structure

```
database/
├── complete_schema.sql  # 🚀 ONE-CLICK SETUP - Complete flattened schema
├── functions/           # Database functions and procedures
├── migrations/         # Now empty - all consolidated into complete_schema.sql
└── test_queries/       # Development testing queries (includes RLS policy tests)
```

## Setup Instructions

### For New Installations (Recommended)

**🚀 ONE-CLICK SETUP** - Run the complete flattened schema:
```sql
-- Complete database setup in one file
-- File: database/complete_schema.sql
```

This single file consolidates everything that was previously scattered across multiple files:
- Core session tables and chat functionality
- Security tables (rate limiting, email suppression, etc.)
- Vector embeddings with pgvector extension
- All incremental fixes and updates
- Optimized indexes and RLS policies

**Includes:**
- ✅ All core tables (sessions, messages, knowledge base, admin)
- ✅ Security tables (rate limiting, email suppression, disposable domains)
- ✅ Vector embeddings with pgvector extension
- ✅ Optimized indexes and RLS policies
- ✅ Analytics views with security fixes
- ✅ Initial data and admin setup

### 🧹 Cleanup Complete

All individual schema and migration files have been removed since `complete_schema.sql` contains everything needed.

### For Existing Installations

**Recommended**: Drop and recreate with `complete_schema.sql` for a clean state.

**If you must preserve data**:
1. Export existing data  
2. Run `complete_schema.sql` for clean schema
3. Import data back

Individual migrations are no longer supported - everything is consolidated.

## Core Tables Created

### Session Management
- `chat_sessions` - Session tokens, queue positions, status tracking
- `chat_messages` - All conversation messages with AI metadata
- `knowledge_base` - Structured knowledge for AI context
- `training_conversations` - Curated conversations for training
- `daily_budgets` - Cost monitoring and limits
- `admin_users` - Admin access control

### Security System  
- `suppressed_emails` - Email blacklist/whitelist with expiration
- `rate_limits` - IP and email rate limiting with automatic blocking
- `email_events` - Postmark webhook event tracking (bounces, complaints)
- `disposable_email_domains` - Blocked disposable email providers

## Environment Variables Required

After setting up the database, ensure these environment variables are configured:

```bash
# Database
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# reCAPTCHA v3
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=your_recaptcha_site_key
RECAPTCHA_SECRET_KEY=your_recaptcha_secret_key

# Email Service
POSTMARK_SERVER_TOKEN=your_postmark_server_token

# Admin Setup
ADMIN_EMAIL=admin@brianfending.com
```

## Post-Setup Tasks

1. **Add admin user** (in Supabase SQL Editor):
   ```sql
   INSERT INTO admin_users (email, is_active) 
   VALUES ('admin@brianfending.com', true)
   ON CONFLICT (email) DO NOTHING;
   ```

2. **Configure Postmark webhook**:
   - URL: `https://ai.brianfending.com/api/webhooks/postmark`
   - Events: Bounce, Complaint, Delivery

3. **Configure reCAPTCHA domains**:
   - Development: `localhost`
   - Production: `ai.brianfending.com`

## Features Enabled

After completing the setup, your application will have:

- ✅ **Multi-layer Security** (reCAPTCHA + rate limiting + email suppression)
- ✅ **Real-time Queue Management** with live position updates  
- ✅ **Email Authentication** with automatic session management
- ✅ **Admin Dashboard** with comprehensive analytics
- ✅ **Smart Progressive Loader** with abort functionality
- ✅ **Knowledge Base Management** with suggestion workflow