-- CreateEnum
CREATE TYPE "CampaignReplyMode" AS ENUM ('DISABLED', 'AUTO', 'REVIEW');

-- CreateEnum
CREATE TYPE "InboundReplyStatus" AS ENUM ('PENDING_REVIEW', 'APPROVED', 'SENT', 'SKIPPED');

-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN "replyMode" "CampaignReplyMode" NOT NULL DEFAULT 'DISABLED';

-- AlterTable
ALTER TABLE "EmailLog" ADD COLUMN "isAiReply" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "InboundReply" (
    "id" TEXT NOT NULL,
    "emailLogId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "campaignId" TEXT,
    "userId" TEXT NOT NULL,
    "fromEmail" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "intent" TEXT,
    "aiSubject" TEXT,
    "aiBody" TEXT,
    "aiReasoning" TEXT,
    "status" "InboundReplyStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "responseEmailLogId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InboundReply_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InboundReply_emailLogId_key" ON "InboundReply"("emailLogId");

-- CreateIndex
CREATE UNIQUE INDEX "InboundReply_responseEmailLogId_key" ON "InboundReply"("responseEmailLogId");

-- AddForeignKey
ALTER TABLE "InboundReply" ADD CONSTRAINT "InboundReply_emailLogId_fkey" FOREIGN KEY ("emailLogId") REFERENCES "EmailLog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InboundReply" ADD CONSTRAINT "InboundReply_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InboundReply" ADD CONSTRAINT "InboundReply_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InboundReply" ADD CONSTRAINT "InboundReply_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InboundReply" ADD CONSTRAINT "InboundReply_responseEmailLogId_fkey" FOREIGN KEY ("responseEmailLogId") REFERENCES "EmailLog"("id") ON DELETE SET NULL ON UPDATE CASCADE;
