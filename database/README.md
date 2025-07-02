# Database Setup

This directory contains all database schema files and migrations for the fending-gpt application.

## Directory Structure

```
database/
├── schema/          # Complete database schemas
│   ├── schema.sql                # Original legacy schema
│   ├── schema-sessions.sql       # Session-based chat schema (initial)
│   ├── schema-sessions-fixed.sql # Session-based chat schema (corrected)
│   └── schema-updates.sql        # Security and rate limiting tables
└── migrations/      # Incremental database changes
    └── migration-add-ended-at.sql # Adds ended_at field and status constraint
```

## Setup Instructions

### For New Installations

1. **Run the complete schema** (in Supabase SQL Editor):
   ```sql
   -- Run this file first for core session-based functionality
   -- File: database/schema/schema-sessions-fixed.sql
   ```

2. **Add security features** (in Supabase SQL Editor):
   ```sql
   -- Run this file for multi-layer security system
   -- File: database/schema/schema-updates.sql
   ```

3. **Apply latest migrations** (in Supabase SQL Editor):
   ```sql
   -- Run this file for real-time queue functionality
   -- File: database/migrations/migration-add-ended-at.sql
   ```

### For Existing Installations

If you already have a database, only run the files you haven't applied yet:

- **Check if you have security tables**: `suppressed_emails`, `rate_limits`, `email_events`, `disposable_email_domains`
  - If missing, run: `database/schema/schema-updates.sql`

- **Check if chat_sessions has ended_at field**:
  ```sql
  SELECT column_name FROM information_schema.columns 
  WHERE table_name = 'chat_sessions' AND column_name = 'ended_at';
  ```
  - If missing, run: `database/migrations/migration-add-ended-at.sql`

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