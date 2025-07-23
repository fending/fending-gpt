# Database Migrations

**All migrations have been consolidated into `../complete_schema.sql`.**

For new installations, use the complete schema file instead of individual migrations.

## Status

### ✅ All Migrations Consolidated
All database changes are now included in `complete_schema.sql`:
- ✅ `ended_at` field and status constraint updates
- ✅ pgvector extension and embedding columns  
- ✅ All security fixes and view corrections
- ✅ Core tables, security tables, and functions

### 🎯 Migration Directory Cleaned
All files have been removed or relocated:
- Migration files → Consolidated into `../complete_schema.sql`
- Test files → Moved to `../test_queries/`

## For Existing Installations

**Recommended approach**: Drop your current database and recreate with `complete_schema.sql` for a clean state.

**If you must preserve data**:
1. Export your existing data
2. Run `complete_schema.sql` to create clean schema  
3. Import your data back

The individual migration approach is no longer supported since all changes have been consolidated.