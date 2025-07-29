-- AlterTable
ALTER TABLE "Comment" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "ipAddress" TEXT,
ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isPinned" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pinnedOrder" INTEGER,
ADD COLUMN     "reviewNote" TEXT,
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "reviewedBy" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'pending',
ADD COLUMN     "userAgent" TEXT;

-- CreateTable
CREATE TABLE "CommentModerationLog" (
    "id" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "moderatorId" TEXT NOT NULL,
    "note" TEXT,
    "previousStatus" TEXT,
    "previousIsPinned" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommentModerationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpamDetectionLog" (
    "id" TEXT NOT NULL,
    "commentId" TEXT,
    "detectionType" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userId" TEXT,
    "content" TEXT,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SpamDetectionLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CommentModerationLog_commentId_idx" ON "CommentModerationLog"("commentId");

-- CreateIndex
CREATE INDEX "CommentModerationLog_moderatorId_idx" ON "CommentModerationLog"("moderatorId");

-- CreateIndex
CREATE INDEX "CommentModerationLog_createdAt_idx" ON "CommentModerationLog"("createdAt");

-- CreateIndex
CREATE INDEX "SpamDetectionLog_ipAddress_idx" ON "SpamDetectionLog"("ipAddress");

-- CreateIndex
CREATE INDEX "SpamDetectionLog_userId_idx" ON "SpamDetectionLog"("userId");

-- CreateIndex
CREATE INDEX "SpamDetectionLog_detectionType_result_idx" ON "SpamDetectionLog"("detectionType", "result");

-- CreateIndex
CREATE INDEX "SpamDetectionLog_createdAt_idx" ON "SpamDetectionLog"("createdAt");

-- CreateIndex
CREATE INDEX "Comment_postId_status_isPinned_createdAt_idx" ON "Comment"("postId", "status", "isPinned", "createdAt");

-- CreateIndex
CREATE INDEX "Comment_status_createdAt_idx" ON "Comment"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Comment_userId_idx" ON "Comment"("userId");

-- CreateIndex
CREATE INDEX "Comment_isDeleted_idx" ON "Comment"("isDeleted");

-- AddForeignKey
ALTER TABLE "CommentModerationLog" ADD CONSTRAINT "CommentModerationLog_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpamDetectionLog" ADD CONSTRAINT "SpamDetectionLog_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
