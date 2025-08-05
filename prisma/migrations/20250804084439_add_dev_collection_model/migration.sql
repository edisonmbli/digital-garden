/*
  Warnings:

  - You are about to drop the column `description` on the `Collection` table. All the data in the column will be lost.
  - You are about to drop the column `language` on the `Collection` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `Collection` table. All the data in the column will be lost.
  - You are about to drop the column `sanity_i18n_id` on the `Collection` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[sanity_id]` on the table `Collection` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `name_en` to the `Collection` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name_zh` to the `Collection` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Collection_language_idx";

-- DropIndex
DROP INDEX "Collection_sanity_i18n_id_language_key";

-- AlterTable
ALTER TABLE "Collection" DROP COLUMN "description",
DROP COLUMN "language",
DROP COLUMN "name",
DROP COLUMN "sanity_i18n_id",
ADD COLUMN     "description_en" TEXT,
ADD COLUMN     "description_zh" TEXT,
ADD COLUMN     "name_en" TEXT NOT NULL,
ADD COLUMN     "name_zh" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "dev_collections" (
    "id" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "name_zh" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description_en" TEXT,
    "description_zh" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "cover_image_url" TEXT,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "sanity_id" TEXT NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "dev_collections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "posts_on_dev_collections" (
    "postId" TEXT NOT NULL,
    "dev_collection_id" TEXT NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assigned_by" TEXT NOT NULL,

    CONSTRAINT "posts_on_dev_collections_pkey" PRIMARY KEY ("postId","dev_collection_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "dev_collections_sanity_id_key" ON "dev_collections"("sanity_id");

-- CreateIndex
CREATE INDEX "dev_collections_isFeatured_idx" ON "dev_collections"("isFeatured");

-- CreateIndex
CREATE INDEX "dev_collections_is_deleted_idx" ON "dev_collections"("is_deleted");

-- CreateIndex
CREATE INDEX "dev_collections_slug_idx" ON "dev_collections"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Collection_sanity_id_key" ON "Collection"("sanity_id");

-- AddForeignKey
ALTER TABLE "posts_on_dev_collections" ADD CONSTRAINT "posts_on_dev_collections_dev_collection_id_fkey" FOREIGN KEY ("dev_collection_id") REFERENCES "dev_collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posts_on_dev_collections" ADD CONSTRAINT "posts_on_dev_collections_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
