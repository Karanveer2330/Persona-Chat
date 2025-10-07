# Mobile Access Firewall Rules
# Run this script as Administrator

Write-Host "🔥 Adding Firewall Rules for Mobile Access..." -ForegroundColor Green

# Add rule for Next.js app (port 9002)
Write-Host "Adding rule for port 9002..." -ForegroundColor Yellow
netsh advfirewall firewall add rule name="Next.js App Port 9002" dir=in action=allow protocol=TCP localport=9002

# Add rule for backend server (port 5000)
Write-Host "Adding rule for port 5000..." -ForegroundColor Yellow
netsh advfirewall firewall add rule name="Backend Server Port 5000" dir=in action=allow protocol=TCP localport=5000

Write-Host "✅ Firewall rules added successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "📱 Mobile Access URLs:" -ForegroundColor Cyan
Write-Host "   Main App: http://[YOUR_IP]:9002" -ForegroundColor White
Write-Host "   Chat: http://[YOUR_IP]:9002/chat/global" -ForegroundColor White
Write-Host "   Video Call: http://[YOUR_IP]:9002/video-call" -ForegroundColor White
Write-Host ""
Write-Host "To find your IP address, run: ipconfig" -ForegroundColor Yellow 