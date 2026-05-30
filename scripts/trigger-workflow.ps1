# Trigger Daily Digest and Deploy on GitHub Actions.
# Uses workflow file name to avoid shell issues with special characters in display names.
param(
  [string]$Ref = 'main'
)

$ErrorActionPreference = 'Stop'
$workflowFile = 'daily-digest.yml'

Write-Host "Triggering workflow $workflowFile on ref $Ref ..."
gh workflow run $workflowFile --ref $Ref
if ($LASTEXITCODE -ne 0) {
  Write-Error @"
Failed to dispatch workflow. Common fixes:
  1. gh auth refresh -h github.com -s workflow
  2. Run from: https://github.com/MTNT-Products/daily-three/actions/workflows/daily-digest.yml
"@
}

Start-Sleep -Seconds 3
gh run list --workflow=$workflowFile --limit 1
