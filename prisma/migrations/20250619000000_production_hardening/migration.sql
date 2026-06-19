-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- Lead: unsubscribe token and unique email per user
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "unsubscribeToken" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "Lead_unsubscribeToken_key" ON "Lead"("unsubscribeToken");
CREATE UNIQUE INDEX IF NOT EXISTS "Lead_userId_email_key" ON "Lead"("userId", "email");
