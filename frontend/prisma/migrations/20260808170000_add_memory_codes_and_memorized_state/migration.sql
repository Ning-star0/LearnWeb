CREATE SEQUENCE "MemoryCardCodeSeq" START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;

ALTER TABLE "MemoryCard"
ADD COLUMN "code" TEXT,
ADD COLUMN "memorizedCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "lastMemorizedAt" TIMESTAMP(3);

UPDATE "MemoryCard"
SET "code" = 'FM-' || lpad(nextval('"MemoryCardCodeSeq"')::text, 6, '0')
WHERE "code" IS NULL;

ALTER TABLE "MemoryCard"
ALTER COLUMN "code" SET NOT NULL,
ALTER COLUMN "code" SET DEFAULT ('FM-' || lpad(nextval('"MemoryCardCodeSeq"')::text, 6, '0'));

ALTER TABLE "MemoryReview"
ADD COLUMN "memorizedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "MemoryCard_code_key" ON "MemoryCard"("code");
CREATE INDEX "MemoryCard_subjectId_code_idx" ON "MemoryCard"("subjectId", "code");
