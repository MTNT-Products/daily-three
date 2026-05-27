export interface LlmConfig {
  anthropicApiKey: string;
  anthropicModel: string;
}

export function getLlmConfig(): LlmConfig {
  const anthropicApiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!anthropicApiKey) {
    throw new Error('ANTHROPIC_API_KEY is required. Set it in .env or GitHub Secrets.');
  }
  return {
    anthropicApiKey,
    anthropicModel: process.env.ANTHROPIC_MODEL ?? 'claude-haiku-4-5-20251001',
  };
}
