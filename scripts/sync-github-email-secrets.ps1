# Push RESEND_API_KEY / EMAIL_TO from .env to GitHub Actions secrets (values never echoed).
# Usage: .\scripts\sync-github-email-secrets.ps1
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$envFile = Join-Path $root '.env'

if (-not (Test-Path $envFile)) {
  Write-Error ".env not found. Set RESEND_API_KEY locally first (see docs/SUBSCRIBE.md)."
}

function Read-DotEnvKey([string]$Name) {
  foreach ($line in Get-Content $envFile -Encoding UTF8) {
    if ($line -match "^\s*$([regex]::Escape($Name))\s*=\s*(.+)\s*$") {
      $v = $Matches[1].Trim()
      if ($v.StartsWith('"') -and $v.EndsWith('"')) { $v = $v.Substring(1, $v.Length - 2) }
      if ($v.StartsWith("'") -and $v.EndsWith("'")) { $v = $v.Substring(1, $v.Length - 2) }
      return $v
    }
  }
  return $null
}

$resend = Read-DotEnvKey 'RESEND_API_KEY'
$emailTo = Read-DotEnvKey 'EMAIL_TO'

if (-not $resend -or $resend -notmatch '^re_') {
  Write-Error 'RESEND_API_KEY missing or invalid in .env (must start with re_).'
}

Push-Location $root
try {
  gh secret set RESEND_API_KEY --body $resend
  Write-Host 'OK: RESEND_API_KEY updated on GitHub (value not shown).'
  if ($emailTo) {
    gh secret set EMAIL_TO --body $emailTo
    Write-Host 'OK: EMAIL_TO updated on GitHub (value not shown).'
  } else {
    Write-Warning 'EMAIL_TO not in .env — admin copy will stay disabled.'
  }
} finally {
  Pop-Location
}
