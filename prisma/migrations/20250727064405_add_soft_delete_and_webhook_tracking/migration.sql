-- AlterTable
ALTER TABLE "Collection" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "WebhookCall" (
    "id" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookCall_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WebhookCall_createdAt_idx" ON "WebhookCall"("createdAt");

-- CreateIndex
CREATE INDEX "WebhookCall_operation_documentType_idx" ON "WebhookCall"("operation", "documentType");

-- CreateIndex
CREATE INDEX "Collection_isDeleted_idx" ON "Collection"("isDeleted");

-- CreateIndex
CREATE INDEX "Post_isDeleted_idx" ON "Post"("isDeleted");
