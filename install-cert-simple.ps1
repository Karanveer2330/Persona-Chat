# Install certificate directly without OpenSSL conversion
$certPath = "certs\localhost.pem"

if (!(Test-Path $certPath)) {
    Write-Host "Certificate file not found: $certPath" -ForegroundColor Red
    exit 1
}

Write-Host "Importing certificate: $certPath" -ForegroundColor Cyan

# Import directly to Trusted Root
$result = Import-Certificate -FilePath $certPath -CertStoreLocation Cert:\LocalMachine\Root
if ($result) {
    Write-Host "Certificate imported successfully!" -ForegroundColor Green
    Write-Host "Note: You may need to restart your browser" -ForegroundColor Yellow
} else {
    Write-Host "Failed to import certificate" -ForegroundColor Red
    Write-Host "Try running PowerShell as Administrator" -ForegroundColor Yellow
    exit 1
}
