# PowerShell script to generate SSL certificates for HTTPS development
# This uses Windows built-in certificate generation

Write-Host "Generating SSL certificates for HTTPS development..." -ForegroundColor Green

# Create certs directory if it doesn't exist
$certsDir = Join-Path $PSScriptRoot "certs"
if (!(Test-Path $certsDir)) {
    New-Item -ItemType Directory -Path $certsDir -Force
    Write-Host "Created certs directory" -ForegroundColor Blue
}

try {
    # Generate self-signed certificate using PowerShell
    Write-Host "Generating self-signed certificate..." -ForegroundColor Yellow
    
    $cert = New-SelfSignedCertificate -DnsName "localhost", "127.0.0.1", "192.168.1.8" -CertStoreLocation "cert:\LocalMachine\My" -NotAfter (Get-Date).AddYears(1)
    
    # Export certificate to PEM format
    $certPath = Join-Path $certsDir "localhost.pem"
    $keyPath = Join-Path $certsDir "localhost-key.pem"
    
    # Export certificate
    $certBytes = $cert.Export([System.Security.Cryptography.X509Certificates.X509ContentType]::Cert)
    $certPem = "-----BEGIN CERTIFICATE-----`n"
    $certPem += [System.Convert]::ToBase64String($certBytes, [System.Base64FormattingOptions]::InsertLineBreaks)
    $certPem += "`n-----END CERTIFICATE-----"
    [System.IO.File]::WriteAllText($certPath, $certPem)
    
    # Export private key
    $keyBytes = $cert.PrivateKey.ExportPkcs8PrivateKey()
    $keyPem = "-----BEGIN PRIVATE KEY-----`n"
    $keyPem += [System.Convert]::ToBase64String($keyBytes, [System.Base64FormattingOptions]::InsertLineBreaks)
    $keyPem += "`n-----END PRIVATE KEY-----"
    [System.IO.File]::WriteAllText($keyPath, $keyPem)
    
    Write-Host "SSL certificates generated successfully!" -ForegroundColor Green
    Write-Host "Certificates saved to: $certPath and $keyPath" -ForegroundColor Blue
    Write-Host "You can now run: npm run dev:https-server" -ForegroundColor Cyan
    Write-Host "Note: You may need to trust the certificate in your browser" -ForegroundColor Yellow
    
} catch {
    Write-Host "Error generating certificates: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Try running PowerShell as Administrator" -ForegroundColor Yellow
}