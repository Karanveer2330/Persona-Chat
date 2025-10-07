
# PowerShell script to generate self-signed certificate
$cert = New-SelfSignedCertificate -DnsName "localhost", "127.0.0.1", "192.168.1.4" -CertStoreLocation "cert:\LocalMachine\My" -NotAfter (Get-Date).AddYears(1)
$certPath = "certs\localhost.pem"
$keyPath = "certs\localhost-key.pem"

# Export certificate
$certBytes = $cert.Export([System.Security.Cryptography.X509Certificates.X509ContentType]::Cert)
[System.IO.File]::WriteAllBytes($certPath, $certBytes)

# Export private key (this is simplified - for production use proper key export)
Write-Host "Certificate created at: $certPath"
Write-Host "⚠️  For development only - do not use in production!"
