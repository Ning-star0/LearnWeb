CREATE TYPE "QuestionMaterialType" AS ENUM ('EXAMPLE', 'EXERCISE');

ALTER TABLE "Question"
ADD COLUMN "materialType" "QuestionMaterialType" NOT NULL DEFAULT 'EXERCISE';

CREATE INDEX "Question_subjectId_materialType_idx"
ON "Question"("subjectId", "materialType");
