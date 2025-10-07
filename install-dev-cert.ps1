# Installs the self-signed localhost.pem certificate into Windows Trusted Root Certification Authorities
# Run this script as administrator!
$certPath = "certs\localhost.pem"
if (!(Test-Path $certPath)) {
    Write-Host "Certificate file not found: $certPath" -ForegroundColor Red
    exit 1
}

Write-Host "Importing certificate: $certPath" -ForegroundColor Cyan

# Convert PEM to DER if needed
$derPath = "$env:TEMP\localhost.cer"
openssl x509 -in $certPath -outform der -out $derPath

# Import to Trusted Root
Import-Certificate -FilePath $derPath -CertStoreLocation Cert:\LocalMachine\Root

Write-Host "Certificate imported to Trusted Root Certification Authorities!" -ForegroundColor Green
