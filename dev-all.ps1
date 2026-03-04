param(
    [switch]$UseLocalD1
)

$ErrorActionPreference = "Stop"

Write-Host "SoftCloud Archive 本地开发启动脚本" -ForegroundColor Cyan

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

# 启动 Workers API
Write-Host "启动 Workers API 开发服务器..." -ForegroundColor Green

$workersCommand = if ($UseLocalD1) {
    'cd "' + (Join-Path $root "workers") + '"; npm install; npm run dev -- --local'
} else {
    'cd "' + (Join-Path $root "workers") + '"; npm install; npm run dev'
}

Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    $workersCommand
)

# 启动 Nuxt 前端
Write-Host "启动 Nuxt 前端开发服务器..." -ForegroundColor Green

$frontendPath = Join-Path $root "frontend"
$frontendCommand = @(
    'cd "' + $frontendPath + '"',
    'npm install',
    '$env:NUXT_PUBLIC_API_BASE="http://127.0.0.1:8787"',
    'npm run dev'
) -join '; '

Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    $frontendCommand
)

Write-Host "已在两个独立的 PowerShell 窗口中启动 Workers 与前端。" -ForegroundColor Yellow
Write-Host "Workers:  http://127.0.0.1:8787" -ForegroundColor Yellow
Write-Host "Frontend: http://localhost:3000" -ForegroundColor Yellow

