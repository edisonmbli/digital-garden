-- CreateTable
CREATE TABLE "warmup_logs" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "total_urls" INTEGER NOT NULL,
    "success_count" INTEGER NOT NULL,
    "failure_count" INTEGER NOT NULL,
    "duration" INTEGER NOT NULL,
    "success" BOOLEAN NOT NULL,
    "errors" TEXT[],
    "config" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT NOT NULL,

    CONSTRAINT "warmup_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "warmup_logs_type_idx" ON "warmup_logs"("type");

-- CreateIndex
CREATE INDEX "warmup_logs_success_idx" ON "warmup_logs"("success");

-- CreateIndex
CREATE INDEX "warmup_logs_created_at_idx" ON "warmup_logs"("created_at");

-- CreateIndex
CREATE INDEX "warmup_logs_created_by_idx" ON "warmup_logs"("created_by");
