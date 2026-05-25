# LLM コスト参考（Daily Three 運用）

試算条件: **入力 5,000 / 出力 1,000 トークン** × **月20回**（平日 digest のみ）。  
為替 **$1 ≈ ¥150**（目安）。公表料金は変動するため、[OpenAI](https://developers.openai.com/api/docs/pricing) / [Gemini](https://ai.google.dev/gemini-api/docs/pricing) / [Claude](https://platform.claude.com/docs/en/about-claude/pricing) で要確認。

## eval で比較するモデル

| Slug | ティア | モデル | 入力 $/1M | 出力 $/1M | 月20回 USD | 月20回 ¥目安 |
|------|--------|--------|-----------|-----------|------------|-------------|
| `rule` | 基準線 | （API なし） | — | — | $0 | ¥0 |
| `openai-mini` | 廉価 | gpt-4o-mini | 0.15 | 0.60 | ~$0.03 | ~¥5 |
| `openai-4o` | 一つ上 | gpt-4o | 2.50 | 10.00 | ~$0.45 | ~¥70 |
| `gemini-flash` | 廉価 | gemini-2.0-flash | 0.10 | 0.40 | ~$0.02 | ~¥3 |
| `gemini-25-flash` | 一つ上 | gemini-2.5-flash | 0.30 | 2.50 | ~$0.06 | ~¥9 |
| `anthropic-haiku` | 廉価 | claude-haiku-4-5 | 1.00 | 5.00 | ~$0.20 | ~¥30 |
| `anthropic-sonnet` | 一つ上 | claude-sonnet-4-6 | 3.00 | 15.00 | ~$0.60 | ~¥90 |

## `npm run eval:llm` 1回のコスト目安

上記7ケースを **すべて API キーあり** で回すと、digest 1回分の約 **7倍**（概算 **$0.05〜0.15 / 回**、**¥8〜23**）。  
品質比較は **月1〜2回** に抑えると十分なことが多い。

## 本番（採用済み）

| 項目 | 値 |
|------|-----|
| プロバイダ | `anthropic`（`LLM_PROVIDER` 省略可） |
| モデル | `claude-haiku-4-5-20251001`（`ANTHROPIC_MODEL`） |
| 月20回の目安 | ~$0.20 / **~¥30** |

`.env` に `ANTHROPIC_API_KEY` のみ必須。Claude Pro 等のサブスクは不要（API 従量課金のみ）。

eval の `*_PLUS` や他社キーは比較用。本番 digest では使わない。
