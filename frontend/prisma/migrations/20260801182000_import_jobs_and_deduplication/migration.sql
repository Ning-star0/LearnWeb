-- CreateEnum
CREATE TYPE "ImportSourceType" AS ENUM ('MARKDOWN', 'ZIP', 'JSON');

-- CreateEnum
CREATE TYPE "ImportJobStatus" AS ENUM ('PREVIEWED', 'COMPLETED', 'ROLLED_BACK', 'FAILED');

-- CreateEnum
CREATE TYPE "ImportConflictStrategy" AS ENUM ('SKIP', 'UPDATE_BASIC', 'CREATE_NEW');

-- AlterTable
ALTER TABLE "Question"
ADD COLUMN "externalId" TEXT,
ADD COLUMN "contentFingerprint" TEXT,
ADD COLUMN "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "importJobId" TEXT;

-- AlterTable
ALTER TABLE "Attachment"
ADD COLUMN "width" INTEGER,
ADD COLUMN "height" INTEGER,
ADD COLUMN "deletedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "ImportJob" (
    "id" TEXT NOT NULL,
    "sourceType" "ImportSourceType" NOT NULL,
    "originalName" TEXT,
    "storedFileName" TEXT,
    "status" "ImportJobStatus" NOT NULL DEFAULT 'PREVIEWED',
    "conflictStrategy" "ImportConflictStrategy" NOT NULL DEFAULT 'SKIP',
    "totalCount" INTEGER NOT NULL DEFAULT 0,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "skippedCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "preview" JSONB NOT NULL,
    "rollbackData" JSONB,
    "errorDetail" JSONB,
    "completedAt" TIMESTAMP(3),
    "rolledBackAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImportJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Question_subjectId_externalId_key" ON "Question"("subjectId", "externalId");

-- CreateIndex
CREATE INDEX "Question_subjectId_contentFingerprint_idx" ON "Question"("subjectId", "contentFingerprint");

-- CreateIndex
CREATE INDEX "Question_importJobId_idx" ON "Question"("importJobId");

-- CreateIndex
CREATE INDEX "ImportJob_status_createdAt_idx" ON "ImportJob"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_importJobId_fkey" FOREIGN KEY ("importJobId") REFERENCES "ImportJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;
