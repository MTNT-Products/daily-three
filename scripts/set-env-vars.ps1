# Update .env key=value lines without printing secrets.
param(
  [Parameter(Mandatory = $true)]
  [hashtable]$Vars
)

$ErrorActionPreference = 'Stop'
$envPath = Join-Path (Split-Path $PSScriptRoot -Parent) '.env'
if (-not (Test-Path $envPath)) {
  throw ".env not found at $envPath"
}

$lines = Get-Content -LiteralPath $envPath -Encoding UTF8
$keys = @($Vars.Keys)

foreach ($key in $keys) {
  $value = [string]$Vars[$key]
  $pattern = '^' + [regex]::Escape($key) + '='
  $idx = 0
  $found = $false
  foreach ($line in $lines) {
    if ($line -match $pattern) {
      $lines[$idx] = "$key=$value"
      $found = $true
      break
    }
    $idx++
  }
  if (-not $found) {
    $lines += "$key=$value"
  }
}

Set-Content -LiteralPath $envPath -Value $lines -Encoding UTF8

foreach ($key in $keys) {
  $len = ([string]$Vars[$key]).Length
  if ($len -gt 0) { Write-Host "$key=SET(len=$len)" } else { Write-Host "$key=EMPTY" }
}
