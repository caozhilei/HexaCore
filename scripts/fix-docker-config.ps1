$daemonPath = "$env:USERPROFILE\.docker\daemon.json"
$dockerDir = "$env:USERPROFILE\.docker"

# Ensure directory exists
if (-not (Test-Path $dockerDir)) {
    New-Item -ItemType Directory -Force -Path $dockerDir | Out-Null
}

# Define new config with proxy ONLY, NO MIRRORS
$config = @{
    "registry-mirrors" = @()
    "proxies" = @{
        "http-proxy" = "http://127.0.0.1:10809"
        "https-proxy" = "http://127.0.0.1:10809"
        "no-proxy" = "localhost,127.0.0.1,::1"
    }
}

# Write config
$config | ConvertTo-Json -Depth 4 | Set-Content $daemonPath -Encoding UTF8

Write-Host "✅ Docker configuration updated successfully at $daemonPath"
Write-Host "❌ Removed ALL registry-mirrors (forcing direct connection via proxy)"
Write-Host "🌐 Configured proxy to http://127.0.0.1:10809"
Write-Host "⚠️  PLEASE RESTART DOCKER DESKTOP FOR CHANGES TO TAKE EFFECT! ⚠️"
