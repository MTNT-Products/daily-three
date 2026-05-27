# Trigger Daily Digest and Deploy on GitHub Actions.
# Uses workflow ID (not display name) to avoid shell issues with special characters.
param(
  [string]$Ref = 'main'
)

$ErrorActionPreference = 'Stop'
$workflowId = 282451376

Write-Host "Triggering workflow $workflowId on ref $Ref ..."
gh workflow run $workflowId --ref $Ref
if ($LASTEXITCODE -ne 0) {
  Write-Error @"
Failed to dispatch workflow. Common fixes:
  1. gh auth refresh -h github.com -s workflow
  2. Run from: https://github.com/rhcpgtbd0611-moto/daily-three/actions/workflows/daily-digest.yml
"@
}

Start-Sleep -Seconds 3
gh run list --workflow=$workflowId --limit 1
