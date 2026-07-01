$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
  Write-Host "Node.js is required. Install the current LTS version from https://nodejs.org/ and run this file again." -ForegroundColor Yellow
  Read-Host "Press Enter to close"
  exit 1
}

$secure = Read-Host "Create your private SahayaScribe admin password" -AsSecureString
$pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try {
  $env:ADMIN_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
} finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
}

if ([string]::IsNullOrWhiteSpace($env:ADMIN_PASSWORD)) {
  Write-Host "A non-empty admin password is required." -ForegroundColor Red
  exit 1
}

Set-Location -LiteralPath $PSScriptRoot
node server.js
