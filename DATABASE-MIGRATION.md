# Database Migration Guide

This guide helps you migrate your existing database to support the new enhanced features.

## New Features Requiring Database Changes

The latest updates add the following fields to the database schema:

1. **Submission.claimedById** - Tracks which reviewer/admin claimed a task
2. **Review.accountPostedIn** - Optional field for reviewers to specify where content was posted (visible only to admins)

## Migration Options

### Option 1: Automatic Migration (Recommended)

If you're using Prisma and have a development database, run:

```bash
# Generate a new migration
npx prisma migrate dev --name add_claimed_and_account_fields

# Apply the migration
npx prisma migrate deploy
```

This will automatically:
- Add the `claimedById` field to the `Submission` table
- Add the `accountPostedIn` field to the `Review` table
- Create necessary indexes
- Set up foreign key constraints

### Option 2: Manual SQL Migration

If you need to run SQL manually (e.g., on a production database), use these commands:

#### For PostgreSQL (Neon, Supabase, etc.):

```sql
-- Add claimedById to Submission table
ALTER TABLE "Submission"
ADD COLUMN "claimedById" TEXT;

-- Add accountPostedIn to Review table
ALTER TABLE "Review"
ADD COLUMN "accountPostedIn" TEXT;

-- Create index for better query performance
CREATE INDEX "Submission_claimedById_idx" ON "Submission"("claimedById");

-- Add foreign key constraint
ALTER TABLE "Submission"
ADD CONSTRAINT "Submission_claimedById_fkey"
FOREIGN KEY ("claimedById") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
```

### Option 3: Reset Database (Development Only)

⚠️ **WARNING**: This will delete all existing data!

Only use this in development environments:

```bash
# Delete all data and recreate schema
npx prisma migrate reset

# This will:
# 1. Drop the database
# 2. Create a new database
# 3. Apply all migrations
# 4. Run seed script (if you have one)
```

## Verification Steps

After migration, verify the changes:

### 1. Check Schema in Prisma Studio

```bash
npx prisma studio
```

Navigate to the `Submission` and `Review` tables and verify:
- `Submission` has a `claimedById` field (nullable)
- `Review` has an `accountPostedIn` field (nullable)

### 2. Test in Application

1. **Test Claiming**:
   - Log in as a reviewer
   - Claim a pending task
   - Verify the task shows "Claimed by: [Your Name]"

2. **Test Account Field**:
   - Give feedback on a claimed task
   - Enter a value in "Account Posted In"
   - Log in as admin and verify the field is visible
   - Log in as reviewer and verify it's NOT visible

3. **Test Download**:
   - As reviewer/admin, click download button on any submission
   - Verify file downloads correctly

## Handling Existing Data

### Existing Submissions

All existing submissions will have `claimedById` set to `null`, which means:
- They will show as "PENDING" or other status based on their current state
- The "Claimed by" badge won't appear (as expected for unclaimed tasks)
- Reviewers can still claim these tasks normally

### Existing Reviews

All existing reviews will have `accountPostedIn` set to `null`, which means:
- The "Posted in" field won't display (as expected)
- No functionality is broken
- Future reviews can include this information

## Troubleshooting

### Migration Fails with "relation already exists"

If you get an error about relations already existing:

```bash
# Mark migrations as applied without running them
npx prisma migrate resolve --applied add_claimed_and_account_fields
```

### Foreign Key Constraint Fails

If adding the foreign key fails due to orphaned data:

```sql
-- Find submissions with invalid claimedById
SELECT id, claimedById FROM "Submission"
WHERE claimedById IS NOT NULL
AND claimedById NOT IN (SELECT id FROM "User");

-- Clean up orphaned references
UPDATE "Submission"
SET claimedById = NULL
WHERE claimedById IS NOT NULL
AND claimedById NOT IN (SELECT id FROM "User");

-- Then re-run the foreign key constraint
ALTER TABLE "Submission"
ADD CONSTRAINT "Submission_claimedById_fkey"
FOREIGN KEY ("claimedById") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
```

### Prisma Client Out of Sync

After migration, regenerate the Prisma client:

```bash
npx prisma generate
```

Then restart your Next.js development server:

```bash
npm run dev
```

## Production Deployment

For production environments (Vercel, etc.):

1. **Backup your database first**:
   ```bash
   # For Neon/Supabase, use their backup features
   # Or export via Prisma Studio
   ```

2. **Run migration during deployment**:
   - Vercel automatically runs `npx prisma migrate deploy` during build
   - Or add to your build script in `package.json`:
     ```json
     {
       "scripts": {
         "build": "npx prisma migrate deploy && next build"
       }
     }
     ```

3. **Test in staging first** (if available)

4. **Monitor for errors** after deployment

## Rollback Plan

If you need to rollback the migration:

```sql
-- Remove foreign key constraint
ALTER TABLE "Submission"
DROP CONSTRAINT IF EXISTS "Submission_claimedById_fkey";

-- Remove index
DROP INDEX IF EXISTS "Submission_claimedById_idx";

-- Remove columns
ALTER TABLE "Submission" DROP COLUMN IF EXISTS "claimedById";
ALTER TABLE "Review" DROP COLUMN IF EXISTS "accountPostedIn";
```

Then restore your previous Prisma schema and regenerate:

```bash
npx prisma generate
```

## Need Help?

If you encounter issues:
1. Check the Prisma documentation: https://www.prisma.io/docs/concepts/components/prisma-migrate
2. Review the error messages carefully
3. Ensure your database connection string is correct in `.env`
4. Make sure your database user has sufficient permissions

## Summary

After successful migration, you'll have:
- ✅ Fair task distribution (tracked via `claimedById`)
- ✅ Account field for reviewers (stored in `accountPostedIn`)
- ✅ Admin visibility of where content was posted
- ✅ Better task claiming and ownership tracking
- ✅ All existing data preserved and functional
