/**
 * Compare LLM providers on the same candidate set (budget + one tier up per vendor).
 * Usage: npm run eval:llm
 * Outputs: eval/candidates-YYYY-MM-DD.json, eval/<slug>-YYYY-MM-DD.json, eval/COMPARISON.md
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { collectArticles } from './collect.js';
import { buildSourceWeights, loadFeedbackWeights, pickTop3, ruleScore } from './rank.js';
import { getLlmConfig, type LlmConfig, type LlmProvider } from './llm-config.js';
import type { SourcesFile } from './types.js';

const EVAL_DIR = join(process.cwd(), 'eval');
const date = new Date().toISOString().slice(0, 10);

type EvalCase = {
  slug: string;
  provider: LlmProvider;
  model?: string;
  tier: 'baseline' | 'budget' | 'plus';
};

function getEvalCases(): EvalCase[] {
  return [
    { slug: 'rule', provider: 'rule', tier: 'baseline' },
    {
      slug: 'openai-mini',
      provider: 'openai',
      model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
      tier: 'budget',
    },
    {
      slug: 'openai-4o',
      provider: 'openai',
      model: process.env.OPENAI_MODEL_PLUS ?? 'gpt-4o',
      tier: 'plus',
    },
    {
      slug: 'anthropic-haiku',
      provider: 'anthropic',
      model: process.env.ANTHROPIC_MODEL ?? 'claude-haiku-4-5-20251001',
      tier: 'budget',
    },
    {
      slug: 'anthropic-sonnet',
      provider: 'anthropic',
      model: process.env.ANTHROPIC_MODEL_PLUS ?? 'claude-sonnet-4-6',
      tier: 'plus',
    },
    {
      slug: 'gemini-flash',
      provider: 'gemini',
      model: process.env.GOOGLE_MODEL ?? 'gemini-2.0-flash',
      tier: 'budget',
    },
    {
      slug: 'gemini-25-flash',
      provider: 'gemini',
      model: process.env.GOOGLE_MODEL_PLUS ?? 'gemini-2.5-flash',
      tier: 'plus',
    },
  ];
}

function buildEvalConfig(base: LlmConfig, evalCase: EvalCase): LlmConfig {
  const cfg = { ...base, provider: evalCase.provider };
  if (evalCase.model) {
    if (evalCase.provider === 'openai') cfg.openaiModel = evalCase.model;
    if (evalCase.provider === 'anthropic') cfg.anthropicModel = evalCase.model;
    if (evalCase.provider === 'gemini') cfg.googleModel = evalCase.model;
  }
  return cfg;
}

async function runEvalCase(
  evalCase: EvalCase,
  baseConfig: LlmConfig,
  scored: ReturnType<typeof ruleScore>,
): Promise<{ label: string; ok: boolean; result?: { lead: string; articles: unknown[] }; error?: string }> {
  const cfg = buildEvalConfig(baseConfig, evalCase);
  const modelNote = evalCase.model ? ` — ${evalCase.model}` : '';
  try {
    const { lead, articles, provider } = await pickTop3(scored, cfg);
    const activeNote = provider === evalCase.provider ? '' : ` (fallback: ${provider})`;
    return {
      label: `${evalCase.slug}${modelNote}${activeNote}`,
      ok: true,
      result: { lead, articles },
    };
  } catch (e) {
    return {
      label: `${evalCase.slug}${modelNote}`,
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

async function main() {
  const config = parse(readFileSync('sources.yaml', 'utf-8')) as SourcesFile;
  const feedback = loadFeedbackWeights();
  const sourceWeights = buildSourceWeights(config.sources, feedback);

  console.log('[eval] Collecting…');
  const raw = await collectArticles(config.sources);
  const scored = ruleScore(raw, config, sourceWeights);
  const top20 = scored.slice(0, 20);

  mkdirSync(EVAL_DIR, { recursive: true });
  const candidatesPath = join(EVAL_DIR, `candidates-${date}.json`);
  writeFileSync(
    candidatesPath,
    JSON.stringify(
      top20.map((a) => ({
        title: a.title,
        summary: a.summary.slice(0, 280),
        source: a.sourceName,
        url: a.url,
        category: a.category,
        score: a.score,
      })),
      null,
      2,
    ),
  );
  console.log('[eval] Wrote', candidatesPath);

  const baseConfig = getLlmConfig();
  const cases = getEvalCases();
  const lines: string[] = [
    `# LLM comparison — ${date}`,
    '',
    `Candidates: ${top20.length}`,
    '',
    '| Tier | Slug | Model |',
    '|------|------|-------|',
    ...cases.map((c) => `| ${c.tier} | ${c.slug} | ${c.model ?? '—'} |`),
    '',
  ];

  for (const evalCase of cases) {
    const out = await runEvalCase(evalCase, baseConfig, scored);
    const outPath = join(EVAL_DIR, `${evalCase.slug}-${date}.json`);
    if (out.ok && out.result) {
      writeFileSync(outPath, JSON.stringify(out.result, null, 2));
      console.log('[eval] Wrote', outPath);
      lines.push(`## ${out.label}`, '', `**Lead:** ${out.result.lead}`, '');
      for (const [i, a] of (out.result.articles as { title: string; source: string }[]).entries()) {
        lines.push(`${i + 1}. **${a.title}** (${a.source})`);
      }
      lines.push('');
    } else {
      lines.push(`## ${out.label}`, '', `_Skipped: ${out.error ?? 'no API key'}_`, '');
    }
  }

  const comparisonPath = join(EVAL_DIR, 'COMPARISON.md');
  writeFileSync(comparisonPath, lines.join('\n'));
  console.log('[eval] Wrote', comparisonPath);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
