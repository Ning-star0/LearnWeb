-- CreateEnum
CREATE TYPE "AttemptSource" AS ENUM ('MANUAL', 'IMPORT', 'AI');

-- CreateEnum
CREATE TYPE "MasteryOverride" AS ENUM ('FORCE_MASTERED', 'FORCE_ACTIVE');

-- AlterTable
ALTER TABLE "Question"
ADD COLUMN "independentCorrectCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "lastAttemptAt" TIMESTAMP(3),
ADD COLUMN "masteryOverride" "MasteryOverride";

UPDATE "Question"
SET "masteryOverride" = 'FORCE_MASTERED'
WHERE "manuallyMastered" = true;

-- AlterTable
ALTER TABLE "Attempt"
ADD COLUMN "confidence" INTEGER,
ADD COLUMN "errorReason" TEXT,
ADD COLUMN "source" "AttemptSource" NOT NULL DEFAULT 'MANUAL';

-- Backfill the new cached counters from the immutable attempt history.
UPDATE "Question" q
SET
  "independentCorrectCount" = summary."independentCorrectCount",
  "lastAttemptAt" = summary."lastAttemptAt"
FROM (
  SELECT
    "questionId",
    COUNT(*) FILTER (WHERE "result" = 'INDEPENDENT_CORRECT')::INTEGER AS "independentCorrectCount",
    MAX("attemptedAt") AS "lastAttemptAt"
  FROM "Attempt"
  GROUP BY "questionId"
) summary
WHERE q."id" = summary."questionId";

-- Enforce the documented confidence range when a value is present.
ALTER TABLE "Attempt"
ADD CONSTRAINT "Attempt_confidence_check"
CHECK ("confidence" IS NULL OR ("confidence" >= 1 AND "confidence" <= 5));
