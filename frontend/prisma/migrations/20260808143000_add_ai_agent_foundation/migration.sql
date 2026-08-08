CREATE TYPE "AgentMemoryKind" AS ENUM ('PROFILE', 'PREFERENCE', 'GOAL', 'FACT', 'LEARNING_PATTERN', 'CHATGPT_IMPORT', 'SYSTEM');
CREATE TYPE "AgentProposalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXECUTED', 'FAILED');

CREATE TABLE "AiSettings" (
    "id" TEXT NOT NULL DEFAULT 'ai',
    "provider" TEXT NOT NULL DEFAULT 'deepseek',
    "baseUrl" TEXT NOT NULL DEFAULT 'https://api.deepseek.com',
    "model" TEXT NOT NULL DEFAULT 'deepseek-v4-flash',
    "encryptedApiKey" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "systemPrompt" TEXT NOT NULL DEFAULT '你是我的个人学习智能体。你要基于长期记忆理解我的学习目标，诚实区分事实与推断。任何新增、编辑或删除网站数据的操作都必须先生成待批准提案，未经主人明确批准不得执行。',
    "hermesMode" TEXT NOT NULL DEFAULT 'EMBEDDED',
    "mutationApprovalRequired" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AiSettings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AgentMemory" (
    "id" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "kind" "AgentMemoryKind" NOT NULL DEFAULT 'FACT',
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AgentMemory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AgentProposal" (
    "id" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "AgentProposalStatus" NOT NULL DEFAULT 'PENDING',
    "decidedAt" TIMESTAMP(3),
    "executedAt" TIMESTAMP(3),
    "failure" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AgentProposal_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AgentMemory_active_kind_updatedAt_idx" ON "AgentMemory"("active", "kind", "updatedAt");
CREATE INDEX "AgentMemory_source_createdAt_idx" ON "AgentMemory"("source", "createdAt");
CREATE UNIQUE INDEX "AgentMemory_fingerprint_key" ON "AgentMemory"("fingerprint");
CREATE INDEX "AgentProposal_status_createdAt_idx" ON "AgentProposal"("status", "createdAt");
