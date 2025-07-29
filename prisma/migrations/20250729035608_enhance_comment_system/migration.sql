/*
  Warnings:

  - You are about to drop the column `pinnedOrder` on the `Comment` table. All the data in the column will be lost.
  - You are about to drop the column `reviewNote` on the `Comment` table. All the data in the column will be lost.
  - You are about to drop the column `reviewedAt` on the `Comment` table. All the data in the column will be lost.
  - You are about to drop the column `reviewedBy` on the `Comment` table. All the data in the column will be lost.
  - The `status` column on the `Comment` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `note` on the `CommentModerationLog` table. All the data in the column will be lost.
  - You are about to drop the column `previousIsPinned` on the `CommentModerationLog` table. All the data in the column will be lost.
  - You are about to drop the column `previousStatus` on the `CommentModerationLog` table. All the data in the column will be lost.
  - You are about to drop the column `commentId` on the `SpamDetectionLog` table. All the data in the column will be lost.
  - You are about to drop the column `details` on the `SpamDetectionLog` table. All the data in the column will be lost.
  - You are about to drop the column `detectionType` on the `SpamDetectionLog` table. All the data in the column will be lost.
  - You are about to drop the column `result` on the `SpamDetectionLog` table. All the data in the column will be lost.
  - Added the required column `contentSnapshot` to the `CommentModerationLog` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `action` on the `CommentModerationLog` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `isSpam` to the `SpamDetectionLog` table without a default value. This is not possible if the table is not empty.
  - Made the column `content` on table `SpamDetectionLog` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "CommentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- DropForeignKey
ALTER TABLE "SpamDetectionLog" DROP CONSTRAINT "SpamDetectionLog_commentId_fkey";

-- DropIndex
DROP INDEX "Comment_postId_status_isPinned_createdAt_idx";

-- DropIndex
DROP INDEX "Comment_status_createdAt_idx";

-- DropIndex
DROP INDEX "Comment_userId_idx";

-- DropIndex
DROP INDEX "SpamDetectionLog_detectionType_result_idx";

-- AlterTable
ALTER TABLE "Comment" DROP COLUMN "pinnedOrder",
DROP COLUMN "reviewNote",
DROP COLUMN "reviewedAt",
DROP COLUMN "reviewedBy",
ADD COLUMN     "deletedBy" TEXT,
ADD COLUMN     "isAuthorReply" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "moderatedAt" TIMESTAMP(3),
ADD COLUMN     "moderatedBy" TEXT,
ADD COLUMN     "pinnedAt" TIMESTAMP(3),
ADD COLUMN     "pinnedBy" TEXT,
DROP COLUMN "status",
ADD COLUMN     "status" "CommentStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "CommentModerationLog" DROP COLUMN "note",
DROP COLUMN "previousIsPinned",
DROP COLUMN "previousStatus",
ADD COLUMN     "contentSnapshot" TEXT NOT NULL,
ADD COLUMN     "moderatorName" TEXT,
ADD COLUMN     "reason" TEXT,
DROP COLUMN "action",
ADD COLUMN     "action" "CommentStatus" NOT NULL;

-- AlterTable
ALTER TABLE "SpamDetectionLog" DROP COLUMN "commentId",
DROP COLUMN "details",
DROP COLUMN "detectionType",
DROP COLUMN "result",
ADD COLUMN     "confidence" DOUBLE PRECISION,
ADD COLUMN     "isSpam" BOOLEAN NOT NULL,
ADD COLUMN     "reason" TEXT,
ADD COLUMN     "triggerRules" TEXT[],
ADD COLUMN     "userAgent" TEXT,
ALTER COLUMN "content" SET NOT NULL;

-- CreateIndex
CREATE INDEX "Comment_postId_status_idx" ON "Comment"("postId", "status");

-- CreateIndex
CREATE INDEX "Comment_status_idx" ON "Comment"("status");

-- CreateIndex
CREATE INDEX "Comment_isPinned_idx" ON "Comment"("isPinned");

-- CreateIndex
CREATE INDEX "Comment_createdAt_idx" ON "Comment"("createdAt");

-- CreateIndex
CREATE INDEX "Comment_ipAddress_idx" ON "Comment"("ipAddress");

-- CreateIndex
CREATE INDEX "CommentModerationLog_action_idx" ON "CommentModerationLog"("action");

-- CreateIndex
CREATE INDEX "SpamDetectionLog_isSpam_idx" ON "SpamDetectionLog"("isSpam");
