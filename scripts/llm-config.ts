export type LlmProvider = 'openai' | 'anthropic' | 'gemini' | 'rule';

export interface LlmConfig {
  provider: LlmProvider;
  openaiApiKey?: string;
  openaiModel: string;
  anthropicApiKey?: string;
  anthropicModel: string;
  googleApiKey?: string;
  googleModel: string;
}

export function getLlmConfig(): LlmConfig {
  const provider = (process.env.LLM_PROVIDER ?? 'anthropic') as LlmProvider;
  return {
    provider,
    openaiApiKey: process.env.OPENAI_API_KEY || undefined,
    openaiModel: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
    anthropicApiKey: process.env.ANTHROPIC_API_KEY || undefined,
    anthropicModel: process.env.ANTHROPIC_MODEL ?? 'claude-haiku-4-5-20251001',
    googleApiKey: process.env.GOOGLE_API_KEY || undefined,
    googleModel: process.env.GOOGLE_MODEL ?? 'gemini-2.0-flash',
  };
}

export function resolveActiveProvider(config: LlmConfig): LlmProvider {
  if (config.provider === 'rule') return 'rule';
  if (config.provider === 'openai' && config.openaiApiKey) return 'openai';
  if (config.provider === 'anthropic' && config.anthropicApiKey) return 'anthropic';
  if (config.provider === 'gemini' && config.googleApiKey) return 'gemini';
  return 'rule';
}
