# Fix Prisma schema syntax errors
$content = Get-Content "prisma/schema.prisma" -Raw

# Fix the field definitions that have syntax errors
$content = $content -replace "status            String   @default\('draft'\) // 'draft', 'review', 'ready', 'scheduled', 'published'", "status            String   @default('draft') // 'draft', 'review', 'ready', 'scheduled', 'published'"
$content = $content -replace "status                String   @default\('pending'\) // 'pending', 'scheduled', 'generating', 'completed', 'archived'", "status                String   @default('pending') // 'pending', 'scheduled', 'generating', 'completed', 'archived'"
$content = $content -replace "generationSource  String @default\('scheduled'\) // 'scheduled', 'manual_now'", "generationSource  String @default('scheduled') // 'scheduled', 'manual_now'"
$content = $content -replace "status            String @default\('pending'\) // 'pending', 'generating', 'completed', 'failed'", "status            String @default('pending') // 'pending', 'generating', 'completed', 'failed'"
$content = $content -replace "status      String   @default\('pending'\) // 'pending', 'reviewed', 'fixed', 'ignored'", "status      String   @default('pending') // 'pending', 'reviewed', 'fixed', 'ignored'"

Set-Content "prisma/schema.prisma" $content
Write-Host "Schema fixed!"
