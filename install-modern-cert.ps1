# Modern Certificate Installation Script for Chat App
# This script installs development SSL certificates on Windows

param(
    [switch]$Force,
    [switch]$Verbose
)

Write-Host "🔐 Modern Certificate Installation for Chat App" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan

# Check if running as administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")

if (-not $isAdmin) {
    Write-Host "❌ This script requires administrator privileges." -ForegroundColor Red
    Write-Host "   Please run PowerShell as Administrator and try again." -ForegroundColor Yellow
    exit 1
}

# Function to check if certificate exists
function Test-CertificateExists {
    param([string]$Thumbprint)
    
    try {
        $cert = Get-ChildItem -Path "Cert:\LocalMachine\Root" | Where-Object { $_.Thumbprint -eq $Thumbprint }
        return $cert -ne $null
    }
    catch {
        return $false
    }
}

# Function to install certificate
function Install-Certificate {
    param([string]$CertPath, [string]$Store = "Root")
    
    try {
        if (-not (Test-Path $CertPath)) {
            Write-Host "❌ Certificate file not found: $CertPath" -ForegroundColor Red
            return $false
        }
        
        $cert = Import-Certificate -FilePath $CertPath -CertStoreLocation "Cert:\LocalMachine\$Store" -ErrorAction Stop
        Write-Host "✅ Certificate installed successfully: $($cert.Thumbprint)" -ForegroundColor Green
        return $true
    }
    catch {
        Write-Host "❌ Failed to install certificate: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Function to generate certificates if they don't exist
function Generate-Certificates {
    Write-Host "🔧 Generating certificates..." -ForegroundColor Yellow
    
    try {
        # Check if Node.js is available
        $nodeVersion = node --version 2>$null
        if (-not $?) {
            Write-Host "❌ Node.js is not installed or not in PATH" -ForegroundColor Red
            Write-Host "   Please install Node.js from https://nodejs.org/" -ForegroundColor Yellow
            return $false
        }
        
        Write-Host "✅ Node.js found: $nodeVersion" -ForegroundColor Green
        
        # Run certificate generation
        Write-Host "🚀 Running certificate generation..." -ForegroundColor Yellow
        npm run generate-ssl
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Certificates generated successfully!" -ForegroundColor Green
            return $true
        } else {
            Write-Host "❌ Certificate generation failed" -ForegroundColor Red
            return $false
        }
    }
    catch {
        Write-Host "❌ Error generating certificates: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Main installation process
Write-Host "🔍 Checking for existing certificates..." -ForegroundColor Yellow

$certPath = "certs\localhost.pem"
$keyPath = "certs\localhost-key.pem"

# Check if certificates exist
if (-not (Test-Path $certPath) -or -not (Test-Path $keyPath)) {
    Write-Host "⚠️ Certificates not found. Generating new certificates..." -ForegroundColor Yellow
    
    if (-not (Generate-Certificates)) {
        Write-Host "❌ Failed to generate certificates. Exiting." -ForegroundColor Red
        exit 1
    }
}

# Install certificates
Write-Host "📦 Installing certificates..." -ForegroundColor Yellow

$success = $true

# Install CA certificate if it exists
$caCertPath = "certs\ca.pem"
if (Test-Path $caCertPath) {
    Write-Host "🔗 Installing CA certificate..." -ForegroundColor Yellow
    if (-not (Install-Certificate -CertPath $caCertPath -Store "Root")) {
        $success = $false
    }
}

# Install server certificate
Write-Host "🔒 Installing server certificate..." -ForegroundColor Yellow
if (-not (Install-Certificate -CertPath $certPath -Store "Root")) {
    $success = $false
}

if ($success) {
    Write-Host ""
    Write-Host "✅ Certificate installation completed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🌐 Your chat app is now ready for secure connections:" -ForegroundColor Cyan
    Write-Host "   - HTTPS: https://localhost:3443" -ForegroundColor White
    Write-Host "   - HTTP Fallback: http://localhost:3444" -ForegroundColor White
    Write-Host ""
    Write-Host "🚀 To start the server, run:" -ForegroundColor Yellow
    Write-Host "   npm run dev:modern" -ForegroundColor White
    Write-Host ""
    Write-Host "📱 For mobile access:" -ForegroundColor Cyan
    Write-Host "   - Accept the certificate warning in your browser" -ForegroundColor White
    Write-Host "   - Visit: https://localhost:3443/api/test" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "❌ Certificate installation failed!" -ForegroundColor Red
    Write-Host "   Please check the error messages above and try again." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "💡 Troubleshooting tips:" -ForegroundColor Cyan
    Write-Host "   - Make sure you're running as Administrator" -ForegroundColor White
    Write-Host "   - Check that Node.js is installed" -ForegroundColor White
    Write-Host "   - Try running: npm run generate-ssl" -ForegroundColor White
    Write-Host ""
    exit 1
}

# Optional: Test the connection
Write-Host "🧪 Testing connection..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "https://localhost:3443/api/test" -SkipCertificateCheck -TimeoutSec 10
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Connection test successful!" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Connection test returned status: $($response.StatusCode)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️ Connection test failed (server may not be running): $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🎉 Setup complete! Your chat app is ready for secure development." -ForegroundColor Green 