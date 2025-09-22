# Simple Environment Setup Script
Write-Host "Yalla London - Environment Setup" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green
Write-Host ""

# Check if .env.local exists
if (-not (Test-Path ".env.local")) {
    Write-Host "ERROR: .env.local file not found!" -ForegroundColor Red
    Write-Host "Please run: copy .env.example .env.local" -ForegroundColor Yellow
    exit 1
}

Write-Host "Found .env.local file" -ForegroundColor Green
Write-Host ""

Write-Host "SUPABASE CONFIGURATION" -ForegroundColor Magenta
Write-Host "======================" -ForegroundColor Magenta
Write-Host ""

Write-Host "1. Supabase Project URL" -ForegroundColor Cyan
Write-Host "   Current: https://your-project-ref.supabase.co" -ForegroundColor Gray
$supabaseUrl = Read-Host "   Enter your Supabase URL"

Write-Host ""
Write-Host "2. Supabase Anonymous Key" -ForegroundColor Cyan
Write-Host "   Current: your-anon-key-here" -ForegroundColor Gray
$anonKey = Read-Host "   Enter your anon key"

Write-Host ""
Write-Host "3. Supabase Service Role Key" -ForegroundColor Cyan
Write-Host "   Current: your-service-role-key-here" -ForegroundColor Gray
$serviceKey = Read-Host "   Enter your service role key"

Write-Host ""
Write-Host "4. Database Connection String" -ForegroundColor Cyan
Write-Host "   Current: postgresql://username:password@localhost:5432/yalla_london_dev" -ForegroundColor Gray
$databaseUrl = Read-Host "   Enter your database URL"

# Update the .env.local file
Write-Host ""
Write-Host "Updating .env.local file..." -ForegroundColor Yellow

$content = Get-Content ".env.local"
$newContent = @()

foreach ($line in $content) {
    if ($line -match "^NEXT_PUBLIC_SUPABASE_URL=") {
        $newContent += "NEXT_PUBLIC_SUPABASE_URL=$supabaseUrl"
    } elseif ($line -match "^NEXT_PUBLIC_SUPABASE_ANON_KEY=") {
        $newContent += "NEXT_PUBLIC_SUPABASE_ANON_KEY=$anonKey"
    } elseif ($line -match "^SUPABASE_SERVICE_ROLE_KEY=") {
        $newContent += "SUPABASE_SERVICE_ROLE_KEY=$serviceKey"
    } elseif ($line -match "^DATABASE_URL=") {
        $newContent += "DATABASE_URL=$databaseUrl"
    } else {
        $newContent += $line
    }
}

$newContent | Set-Content ".env.local"

Write-Host ""
Write-Host "Environment setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Run: npx prisma db push" -ForegroundColor White
Write-Host "2. Run: vercel --prod" -ForegroundColor White
Write-Host ""
Write-Host "Your keys are stored securely in .env.local" -ForegroundColor Green
Write-Host "Never commit .env.local to version control!" -ForegroundColor Red
