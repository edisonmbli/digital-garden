/*
  Warnings:

  - A unique constraint covering the columns `[sanity_i18n_id]` on the table `Collection` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[sanity_i18n_id,language]` on the table `Collection` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[postId,language]` on the table `Log` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[sanity_document_id]` on the table `Post` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `language` to the `Collection` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sanity_i18n_id` to the `Collection` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sanity_id` to the `Collection` table without a default value. This is not possible if the table is not empty.
  - Added the required column `language` to the `Log` table without a default value. This is not possible if the table is not empty.
  - Added the required column `slug` to the `Log` table without a default value. This is not possible if the table is not empty.
  - Added the required column `contentType` to the `Post` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sanity_document_id` to the `Post` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Collection_name_key";

-- DropIndex
DROP INDEX "Collection_slug_key";

-- DropIndex
DROP INDEX "Log_postId_key";

-- AlterTable
ALTER TABLE "Collection" ADD COLUMN     "coverImageUrl" TEXT,
ADD COLUMN     "isFeatured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "language" TEXT NOT NULL,
ADD COLUMN     "sanity_i18n_id" TEXT NOT NULL,
ADD COLUMN     "sanity_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Log" ADD COLUMN     "excerpt" TEXT,
ADD COLUMN     "language" TEXT NOT NULL,
ADD COLUMN     "slug" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Photo" ADD COLUMN     "descriptionJson" TEXT,
ADD COLUMN     "titleJson" TEXT;

-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "contentType" TEXT NOT NULL,
ADD COLUMN     "sanity_document_id" TEXT NOT NULL;

-- DropEnum
DROP TYPE "PostType";

-- CreateIndex
CREATE UNIQUE INDEX "Collection_sanity_i18n_id_key" ON "Collection"("sanity_i18n_id");

-- CreateIndex
CREATE INDEX "Collection_language_idx" ON "Collection"("language");

-- CreateIndex
CREATE INDEX "Collection_isFeatured_idx" ON "Collection"("isFeatured");

-- CreateIndex
CREATE UNIQUE INDEX "Collection_sanity_i18n_id_language_key" ON "Collection"("sanity_i18n_id", "language");

-- CreateIndex
CREATE INDEX "Log_language_idx" ON "Log"("language");

-- CreateIndex
CREATE INDEX "Log_publishedAt_idx" ON "Log"("publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Log_postId_language_key" ON "Log"("postId", "language");

-- CreateIndex
CREATE UNIQUE INDEX "Post_sanity_document_id_key" ON "Post"("sanity_document_id");

-- CreateIndex
CREATE INDEX "Post_contentType_idx" ON "Post"("contentType");

-- CreateIndex
CREATE INDEX "Post_authorId_idx" ON "Post"("authorId");
