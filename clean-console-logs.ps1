# Remove console logs from production files
# This script removes console.log, console.error, console.warn statements

Write-Host "Cleaning console logs from production files..."

# Files to clean
$files = @(
    "src/components/three-canvas.tsx",
    "src/components/chat/ChatWindow.tsx", 
    "src/components/chat/MediaDisplay.tsx",
    "src/components/video-call/VideoCallWindow.tsx",
    "src/components/video-call/Persona3DVideoCall.tsx",
    "src/app/chat/global/page.tsx",
    "src/app/chat/users/page.tsx",
    "src/app/chat/private/[userId]/page.tsx",
    "src/lib/socket.ts"
)

foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "Cleaning $file..."
        $content = Get-Content $file -Raw
        
        # Remove console.log statements (but keep console.error for production debugging)
        $content = $content -replace 'console\.log\([^)]*\);?\s*', ''
        $content = $content -replace 'console\.warn\([^)]*\);?\s*', ''
        $content = $content -replace 'console\.info\([^)]*\);?\s*', ''
        $content = $content -replace 'console\.debug\([^)]*\);?\s*', ''
        
        # Clean up extra whitespace
        $content = $content -replace '\n\s*\n\s*\n', "`n`n"
        
        Set-Content $file $content
        Write-Host "Cleaned $file"
    }
}

Write-Host "Console log cleanup complete!"
