-- CreateTable
CREATE TABLE "analytics_events" (
    "id" TEXT NOT NULL,
    "event_name" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "date" DATE NOT NULL,
    "session_id" TEXT NOT NULL,
    "userId" TEXT,
    "page" TEXT NOT NULL,
    "referrer" TEXT,
    "user_agent" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "properties" JSONB,
    "performance" JSONB,
    "processed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "server_timestamp" BIGINT NOT NULL,
    "environment" TEXT NOT NULL DEFAULT 'production',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "analytics_events_date_event_name_idx" ON "analytics_events"("date", "event_name");

-- CreateIndex
CREATE INDEX "analytics_events_session_id_idx" ON "analytics_events"("session_id");

-- CreateIndex
CREATE INDEX "analytics_events_userId_idx" ON "analytics_events"("userId");

-- CreateIndex
CREATE INDEX "analytics_events_environment_idx" ON "analytics_events"("environment");

-- CreateIndex
CREATE INDEX "analytics_events_page_idx" ON "analytics_events"("page");
