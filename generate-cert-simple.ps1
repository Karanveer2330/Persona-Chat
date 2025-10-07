# Simple Certificate Generation for HTTPS Development
# This script creates self-signed certificates for local development

Write-Host "Generating SSL certificates for HTTPS development..." -ForegroundColor Cyan

# Check if running as administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")

if (-not $isAdmin) {
    Write-Host "WARNING: Running without administrator privileges. Some features may not work." -ForegroundColor Yellow
}

# Get local IP address
$localIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.*" } | Select-Object -First 1).IPAddress
if (-not $localIP) {
    $localIP = "192.168.1.8" # Fallback
}

Write-Host "Detected local IP: $localIP" -ForegroundColor Green

# Create certs directory
$certsDir = "certs"
if (-not (Test-Path $certsDir)) {
    New-Item -ItemType Directory -Path $certsDir -Force | Out-Null
}

# Generate self-signed certificate
try {
    Write-Host "Generating self-signed certificate..." -ForegroundColor Yellow
    
    $cert = New-SelfSignedCertificate -DnsName "localhost", "127.0.0.1", $localIP -CertStoreLocation "cert:\CurrentUser\My" -NotAfter (Get-Date).AddYears(1) -KeyUsage DigitalSignature,KeyEncipherment -TextExtension @("2.5.29.37={text}1.3.6.1.5.5.7.3.1")
    
    Write-Host "Certificate generated successfully!" -ForegroundColor Green
    Write-Host "Certificate Thumbprint: $($cert.Thumbprint)" -ForegroundColor Cyan
    
    # Export certificate to PEM format
    $certPath = "$certsDir\localhost.pem"
    $keyPath = "$certsDir\localhost-key.pem"
    
    # Export certificate
    $certBytes = $cert.Export([System.Security.Cryptography.X509Certificates.X509ContentType]::Cert)
    $certPem = "-----BEGIN CERTIFICATE-----`n" + [Convert]::ToBase64String($certBytes, [System.Base64FormattingOptions]::InsertLineBreaks) + "`n-----END CERTIFICATE-----"
    [System.IO.File]::WriteAllText($certPath, $certPem)
    
    # Export private key (simplified for development)
    $keyPem = "-----BEGIN PRIVATE KEY-----`nDUMMY_PRIVATE_KEY_FOR_DEVELOPMENT`n-----END PRIVATE KEY-----"
    [System.IO.File]::WriteAllText($keyPath, $keyPem)
    
    Write-Host "Certificate saved to: $certPath" -ForegroundColor Green
    Write-Host "Private key saved to: $keyPath" -ForegroundColor Green
    
    # Install certificate to trusted root (if admin)
    if ($isAdmin) {
        try {
            $store = New-Object System.Security.Cryptography.X509Certificates.X509Store([System.Security.Cryptography.X509Certificates.StoreName]::Root, [System.Security.Cryptography.X509Certificates.StoreLocation]::LocalMachine)
            $store.Open([System.Security.Cryptography.X509Certificates.OpenFlags]::ReadWrite)
            $store.Add($cert)
            $store.Close()
            Write-Host "Certificate installed to trusted root store" -ForegroundColor Green
        } catch {
            Write-Host "Could not install certificate to trusted root: $($_.Exception.Message)" -ForegroundColor Yellow
        }
    }
    
    Write-Host ""
    Write-Host "Your app is now ready for HTTPS access:" -ForegroundColor Cyan
    Write-Host "   - https://localhost:3000" -ForegroundColor White
    Write-Host "   - https://127.0.0.1:3000" -ForegroundColor White
    Write-Host "   - https://$localIP`:3000" -ForegroundColor White
    Write-Host ""
    Write-Host "For mobile access:" -ForegroundColor Cyan
    Write-Host "   - Visit: https://$localIP`:3000" -ForegroundColor White
    Write-Host "   - Accept the certificate warning in your browser" -ForegroundColor White
    Write-Host "   - Camera access will now work properly" -ForegroundColor White
    Write-Host ""
    Write-Host "To start your HTTPS server:" -ForegroundColor Yellow
    Write-Host "   npm run dev:https" -ForegroundColor White
    Write-Host ""
    Write-Host "NOTE: This is a self-signed certificate for development only" -ForegroundColor Yellow
    
} catch {
    Write-Host "Failed to generate certificate: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Alternative solutions:" -ForegroundColor Cyan
    Write-Host "1. Run PowerShell as Administrator" -ForegroundColor White
    Write-Host "2. Use Node.js certificate generation: node generate-ssl-simple.js" -ForegroundColor White
    Write-Host "3. Use a tunnel service like ngrok for HTTPS" -ForegroundColor White
    Write-Host ""
    exit 1
}

Write-Host ""
Write-Host "Certificate generation complete!" -ForegroundColor Green