import { prisma } from '@/lib/prisma';
import { decryptSecret } from '@/lib/secret-box';

export type AiProviderConfig = {
  enabled: boolean;
  provider: string;
  baseUrl: string;
  model: string;
  apiKey: string | null;
  systemPrompt: string;
  mutationApprovalRequired: boolean;
  source: 'database' | 'environment';
};

export async function getAiProviderConfig(): Promise<AiProviderConfig> {
  const settings = await prisma.aiSettings.upsert({ where: { id: 'ai' }, update: {}, create: {} });
  if (settings.encryptedApiKey) {
    return {
      enabled: settings.enabled,
      provider: settings.provider,
      baseUrl: settings.baseUrl.replace(/\/$/, ''),
      model: settings.model,
      apiKey: decryptSecret(settings.encryptedApiKey),
      systemPrompt: settings.systemPrompt,
      mutationApprovalRequired: settings.mutationApprovalRequired,
      source: 'database',
    };
  }
  const apiKey = process.env.AI_API_KEY || null;
  return {
    enabled: settings.enabled || Boolean(apiKey && process.env.AI_BASE_URL && process.env.AI_MODEL),
    provider: settings.provider,
    baseUrl: (process.env.AI_BASE_URL || settings.baseUrl).replace(/\/$/, ''),
    model: process.env.AI_MODEL || settings.model,
    apiKey,
    systemPrompt: settings.systemPrompt,
    mutationApprovalRequired: true,
    source: 'environment',
  };
}
