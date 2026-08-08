ALTER TABLE "MemoryCard"
ADD COLUMN "viewCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "lastViewedAt" TIMESTAMP(3),
ADD COLUMN "nextReviewAt" TIMESTAMP(3);

ALTER TABLE "LearningSettings"
ADD COLUMN "memoryReviewIntervals" INTEGER[] NOT NULL DEFAULT ARRAY[2, 3, 7, 14, 30]::INTEGER[];

CREATE TABLE "MemoryReview" (
    "id" TEXT NOT NULL,
    "memoryCardId" TEXT NOT NULL,
    "dateKey" TEXT NOT NULL,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MemoryReview_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MemoryReview_memoryCardId_dateKey_key" ON "MemoryReview"("memoryCardId", "dateKey");
CREATE INDEX "MemoryReview_dateKey_viewedAt_idx" ON "MemoryReview"("dateKey", "viewedAt");

ALTER TABLE "MemoryReview"
ADD CONSTRAINT "MemoryReview_memoryCardId_fkey"
FOREIGN KEY ("memoryCardId") REFERENCES "MemoryCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;
