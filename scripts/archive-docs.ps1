# PowerShell skripta za arhiviranje dokumentacije
# Izvršava se iz root direktorija projekta

Write-Host "=== Arhiviranje dokumentacije ===" -ForegroundColor Cyan

# Provjeri da li smo u root direktoriju
if (-not (Test-Path "docs")) {
    Write-Host "GREŠKA: Niste u root direktoriju projekta!" -ForegroundColor Red
    exit 1
}

# Kreiraj archive direktorije ako ne postoje
$completedDir = "docs\archive\completed"
$obsoleteDir = "docs\archive\obsolete"

if (-not (Test-Path $completedDir)) {
    New-Item -ItemType Directory -Path $completedDir -Force | Out-Null
    Write-Host "Kreiran direktorij: $completedDir" -ForegroundColor Green
}

if (-not (Test-Path $obsoleteDir)) {
    New-Item -ItemType Directory -Path $obsoleteDir -Force | Out-Null
    Write-Host "Kreiran direktorij: $obsoleteDir" -ForegroundColor Green
}

# Funkcija za premještanje datoteke
function Move-ToArchive {
    param(
        [string]$SourcePath,
        [string]$DestinationDir,
        [string]$Category
    )
    
    if (Test-Path $SourcePath) {
        $fileName = Split-Path -Leaf $SourcePath
        $destPath = Join-Path $DestinationDir $fileName
        
        Move-Item -Path $SourcePath -Destination $destPath -Force
        Write-Host "  ✓ Premješteno: $fileName -> $Category" -ForegroundColor Green
        return $true
    } else {
        Write-Host "  ⚠ Nije pronađeno: $SourcePath" -ForegroundColor Yellow
        return $false
    }
}

Write-Host "`n--- Premještanje COMPLETED planova ---" -ForegroundColor Cyan

# Root level completed plans
$completedFiles = @(
    "neki_plan.md",
    "TEHNICKI_PLAN_AI_FAZA_A.md",
    "TEHNICKI_PLAN_C1_CHAT_API.md",
    "TEHNICKI_PLAN_C2_STUDIO_UI.md",
    "PLAN_ZA_FAZU_3.md",
    "PLAN_PROMPT_ENGINEERING.md",
    "PLAN_ZADATAK_3_8_RAG_CVOROVI.md",
    "PLAN_ZADATAK_3_9_SMART_ROUTING.md",
    "PLAN_ZADATAK_3_10_REFLECTION_PETLJA.md",
    "PLAN_TESTIRANJE_GRAFA.md"
)

$movedCount = 0
foreach ($file in $completedFiles) {
    if (Move-ToArchive -SourcePath $file -DestinationDir $completedDir -Category "completed") {
        $movedCount++
    }
}

# Docs folder completed plans
$docsCompletedFiles = @(
    "docs\novi_plan_za_editor.md",
    "docs\TEHNICKI_PLAN_AI_FAZA_B_v2.md",
    "docs\TEHNICKI_PLAN_REFAKTORING_FAZA2.md",
    "docs\FIXED_PORT_REFACTORING.md",
    "docs\PORT_HANDLING.md",
    "docs\plan_oporavka_koda.md"
)

foreach ($file in $docsCompletedFiles) {
    if (Move-ToArchive -SourcePath $file -DestinationDir $completedDir -Category "completed") {
        $movedCount++
    }
}

# Server folder completed plans
if (Test-Path "server\PLAN_ZA_ZLATNI_PUT.md") {
    if (Move-ToArchive -SourcePath "server\PLAN_ZA_ZLATNI_PUT.md" -DestinationDir $completedDir -Category "completed") {
        $movedCount++
    }
}

Write-Host "`n--- Premještanje OBSOLETE planova ---" -ForegroundColor Cyan

# Obsolete files
$obsoleteFiles = @(
    "docs\PROJEKTNI_PLAN.md"
)

foreach ($file in $obsoleteFiles) {
    if (Move-ToArchive -SourcePath $file -DestinationDir $obsoleteDir -Category "obsolete") {
        $movedCount++
    }
}

Write-Host "`n=== Završeno ===" -ForegroundColor Cyan
Write-Host "Ukupno premješteno datoteka: $movedCount" -ForegroundColor Green
Write-Host "`nArhivirane datoteke možete pronaći u:" -ForegroundColor Yellow
Write-Host "  - docs\archive\completed\ (implementirani planovi)" -ForegroundColor Yellow
Write-Host "  - docs\archive\obsolete\ (stare verzije)" -ForegroundColor Yellow

