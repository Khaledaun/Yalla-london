# =============================================================================
# SECURE ENVIRONMENT SETUP SCRIPT
# =============================================================================
# This script helps you set up your environment variables securely
# Run this script and follow the prompts to enter your Supabase credentials

Write-Host "Yalla London - Secure Environment Setup" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green
Write-Host ""

# Check if .env.local exists
if (-not (Test-Path ".env.local")) {
    Write-Host "❌ .env.local file not found!" -ForegroundColor Red
    Write-Host "Please run: copy .env.example .env.local" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Found .env.local file" -ForegroundColor Green
Write-Host ""

# Function to update environment variable in .env.local
function Update-EnvVar {
    param(
        [string]$Key,
        [string]$Description,
        [string]$CurrentValue
    )
    
    Write-Host "🔑 $Description" -ForegroundColor Cyan
    Write-Host "Current value: $CurrentValue" -ForegroundColor Gray
    
    $newValue = Read-Host "Enter new value (or press Enter to keep current)"
    
    if ($newValue -ne "") {
        # Escape special characters for regex
        $escapedKey = [regex]::Escape($Key)
        $escapedCurrentValue = [regex]::Escape($CurrentValue)
        
        # Update the file
        (Get-Content ".env.local") -replace "$escapedKey=$escapedCurrentValue", "$Key=$newValue" | Set-Content ".env.local"
        Write-Host "✅ Updated $Key" -ForegroundColor Green
    } else {
        Write-Host "⏭️  Keeping current value for $Key" -ForegroundColor Yellow
    }
    Write-Host ""
}

# Get current values from .env.local
$envContent = Get-Content ".env.local" -Raw

# Extract current values using regex
$supabaseUrl = if ($envContent -match "NEXT_PUBLIC_SUPABASE_URL=(.+)") { $matches[1] } else { "https://your-project-ref.supabase.co" }
$supabaseAnonKey = if ($envContent -match "NEXT_PUBLIC_SUPABASE_ANON_KEY=(.+)") { $matches[1] } else { "your-anon-key-here" }
$supabaseServiceKey = if ($envContent -match "SUPABASE_SERVICE_ROLE_KEY=(.+)") { $matches[1] } else { "your-service-role-key-here" }
$databaseUrl = if ($envContent -match "DATABASE_URL=(.+)") { $matches[1] } else { "postgresql://username:password@localhost:5432/yalla_london_dev" }

Write-Host "📋 SUPABASE CONFIGURATION" -ForegroundColor Magenta
Write-Host "=========================" -ForegroundColor Magenta
Write-Host ""

Update-EnvVar -Key "NEXT_PUBLIC_SUPABASE_URL" -Description "Supabase Project URL" -CurrentValue $supabaseUrl
Update-EnvVar -Key "NEXT_PUBLIC_SUPABASE_ANON_KEY" -Description "Supabase Anonymous Key" -CurrentValue $supabaseAnonKey
Update-EnvVar -Key "SUPABASE_SERVICE_ROLE_KEY" -Description "Supabase Service Role Key" -CurrentValue $supabaseServiceKey

Write-Host "📋 DATABASE CONFIGURATION" -ForegroundColor Magenta
Write-Host "=========================" -ForegroundColor Magenta
Write-Host ""

Update-EnvVar -Key "DATABASE_URL" -Description "Database Connection String" -CurrentValue $databaseUrl

Write-Host "🎉 Environment setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Next steps:" -ForegroundColor Cyan
Write-Host "1. Verify your .env.local file has the correct values" -ForegroundColor White
Write-Host "2. Run: npx prisma db push" -ForegroundColor White
Write-Host "3. Run: vercel --prod" -ForegroundColor White
Write-Host ""

# Show a summary of what was configured
Write-Host "📊 Configuration Summary:" -ForegroundColor Yellow
Write-Host "=========================" -ForegroundColor Yellow

$finalContent = Get-Content ".env.local" -Raw
$finalSupabaseUrl = if ($finalContent -match "NEXT_PUBLIC_SUPABASE_URL=(.+)") { $matches[1] } else { "Not set" }
$finalDatabaseUrl = if ($finalContent -match "DATABASE_URL=(.+)") { $matches[1] } else { "Not set" }

Write-Host "Supabase URL: $finalSupabaseUrl" -ForegroundColor White
Write-Host "Database URL: $($finalDatabaseUrl.Substring(0, [Math]::Min(50, $finalDatabaseUrl.Length)))..." -ForegroundColor White
Write-Host ""

Write-Host "Your keys are stored securely in .env.local" -ForegroundColor Green
Write-Host "Never commit .env.local to version control!" -ForegroundColor Red
