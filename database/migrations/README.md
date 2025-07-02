# Database Migrations

This directory contains incremental database changes that should be applied in chronological order.

## Migration History

| Migration | Description | Status |
|-----------|-------------|--------|
| `migration-add-ended-at.sql` | Adds `ended_at` field to `chat_sessions` table and updates status constraint to include 'ended' | ⏳ **Required** |

## How to Apply Migrations

1. **Check current database state** before applying any migration
2. **Run migrations in order** (by filename/date)
3. **Test functionality** after each migration
4. **Mark as applied** in this README when complete

## Migration: Add ended_at Field

**File**: `migration-add-ended-at.sql`
**Purpose**: Enables proper session lifecycle tracking for real-time queue management

**What it does**:
- Adds `ended_at TIMESTAMP WITH TIME ZONE` column to `chat_sessions`
- Updates the status constraint to include 'ended' status
- Required for session end tracking and queue progression

**To apply**:
```sql
-- Copy and paste contents of migration-add-ended-at.sql into Supabase SQL Editor
-- This migration is safe to run multiple times (uses IF NOT EXISTS)
```

**Verification**:
```sql
-- Check that the field was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'chat_sessions' AND column_name = 'ended_at';

-- Check that the constraint was updated  
SELECT constraint_name, check_clause 
FROM information_schema.check_constraints 
WHERE constraint_name = 'chat_sessions_status_check';
```

## Future Migrations

When adding new migrations:
1. **Name format**: `migration-YYYY-MM-DD-description.sql`
2. **Add entry** to the table above
3. **Include verification queries** in this README
4. **Use IF NOT EXISTS** where possible for idempotency