# Copy RESEND_API_KEY / EMAIL_TO into .env (values never echoed).
# Usage (paste key once in this terminal session):
#   $env:RESEND_API_KEY = 're_...'
#   $env:EMAIL_TO = 'you@example.com'   # optional
#   .\scripts\sync-email-env.ps1
param(
  [string]$ResendApiKey = $env:RESEND_API_KEY,
  [string]$EmailTo = $env:EMAIL_TO
)

$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$setEnv = Join-Path $PSScriptRoot 'set-env-vars.ps1'

if (-not $ResendApiKey -or $ResendApiKey -notmatch '^re_') {
  Write-Host @"

Resend API Key が必要です（ステップ B でコピーした re_... の文字列）。

1. https://resend.com/api-keys を開く
2. Create API Key → 表示されたキーをコピー（GitHub Secrets に入れたものと同じでも可）
3. この PowerShell で次を実行してから、もう一度本スクリプト:

   `$env:RESEND_API_KEY = 're_（ここに貼る）'
   `$env:EMAIL_TO = '受信テスト用メール@example.com'
   .\scripts\sync-email-env.ps1

"@
  Start-Process 'https://resend.com/api-keys'
  exit 1
}

$vars = @{ RESEND_API_KEY = $ResendApiKey }
if ($EmailTo) { $vars['EMAIL_TO'] = $EmailTo }

& $setEnv -Vars $vars

Write-Host 'Resend CLI にキーを保存しています...'
npx --yes resend-cli@latest login --key $ResendApiKey -q 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
  Write-Warning 'resend login failed (optional); .env は更新済みです。'
}

Push-Location $root
node scripts/verify-subscribe-setup.mjs
Pop-Location

Write-Host ''
Write-Host '完了: .env に RESEND_API_KEY を書き込みました。npm run dev を再起動してください。'
