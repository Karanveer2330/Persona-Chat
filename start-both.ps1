Write-Host "🚀 Starting SecureMessenger Application..." -ForegroundColor Green
Write-Host ""

# Start Backend Server
Write-Host "📡 Starting Backend Server (Tunnel)..." -ForegroundColor Yellow
Set-Location "server"
Start-Process -FilePath "node" -ArgumentList "tunnel-server.js" -WindowStyle Normal
Start-Sleep -Seconds 3

# Start Frontend Server
Write-Host "🌐 Starting Frontend Server (Next.js)..." -ForegroundColor Yellow
Set-Location ".."
Start-Process -FilePath "npm" -ArgumentList "run", "dev" -WindowStyle Normal
Start-Sleep -Seconds 3

Write-Host ""
Write-Host "✅ Both servers should be starting..." -ForegroundColor Green
Write-Host ""
Write-Host "📋 Access URLs:" -ForegroundColor Cyan
Write-Host "   Backend:  https://localhost:9443" -ForegroundColor White
Write-Host "   Frontend: http://localhost:3000" -ForegroundColor White
Write-Host ""
Write-Host "💡 For camera access, use the backend URL" -ForegroundColor Yellow
Write-Host ""
Write-Host "Press any key to continue..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown") 