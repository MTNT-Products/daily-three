# LLM evaluation outputs

`npm run eval:llm` collects the top 20 scored candidates, then runs **budget + one tier up** per vendor on the **same** set.

## Models compared

| Slug | Tier | Default model |
|------|------|----------------|
| `rule` | baseline | rule-based (no API) |
| `openai-mini` | budget | `OPENAI_MODEL` (gpt-4o-mini) |
| `openai-4o` | plus | `OPENAI_MODEL_PLUS` (gpt-4o) |
| `anthropic-haiku` | budget | `ANTHROPIC_MODEL` (Haiku 4.5) |
| `anthropic-sonnet` | plus | `ANTHROPIC_MODEL_PLUS` (Sonnet 4.6) |
| `gemini-flash` | budget | `GOOGLE_MODEL` (gemini-2.0-flash) |
| `gemini-25-flash` | plus | `GOOGLE_MODEL_PLUS` (gemini-2.5-flash) |

## Files

| File | Description |
|------|-------------|
| `candidates-YYYY-MM-DD.json` | Input snapshot (top 20) |
| `<slug>-YYYY-MM-DD.json` | Output per model (e.g. `openai-4o-2026-05-25.json`) |
| `COMPARISON.md` | Side-by-side summary |
| `COST-REFERENCE.md` | Monthly cost estimates |

## Usage

```bash
# .env に各社 API キーを設定
npm run eval:llm
```

Review `COMPARISON.md` for Japanese quality, article selection, and designer vocabulary.

**Production:** `LLM_PROVIDER=anthropic` + `ANTHROPIC_MODEL=claude-haiku-4-5-20251001`（`.env.example` 参照）。コスト目安は [COST-REFERENCE.md](COST-REFERENCE.md)。

Manual Web comparison: [PROMPT-web-comparison.md](PROMPT-web-comparison.md).
