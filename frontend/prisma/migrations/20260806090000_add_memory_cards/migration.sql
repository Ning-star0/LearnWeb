CREATE TYPE "MemoryCardKind" AS ENUM ('FORMULA', 'TECHNIQUE', 'MEMORY');

CREATE TABLE "MemoryCard" (
    "id" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "kind" "MemoryCardKind" NOT NULL DEFAULT 'FORMULA',
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "contentMarkdown" TEXT NOT NULL,
    "summary" TEXT,
    "tags" TEXT[] NOT NULL,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "showOnHome" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MemoryCard_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MemoryCard_subjectId_kind_idx" ON "MemoryCard"("subjectId", "kind");
CREATE INDEX "MemoryCard_subjectId_showOnHome_pinned_sortOrder_idx" ON "MemoryCard"("subjectId", "showOnHome", "pinned", "sortOrder");

ALTER TABLE "MemoryCard"
ADD CONSTRAINT "MemoryCard_subjectId_fkey"
FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
