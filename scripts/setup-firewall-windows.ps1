# ==============================================================================
# Windows Firewall Setup Script for volo-app
# ==============================================================================
# This script configures the Windows Firewall to allow traffic for the
# Node.js server and the embedded PostgreSQL database during development.
# It should be run only once with Administrator privileges.
# ==============================================================================

# Function to check if running as Administrator
function Test-IsAdmin {
    $currentUser = New-Object Security.Principal.WindowsPrincipal $([Security.Principal.WindowsIdentity]::GetCurrent())
    return $currentUser.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

if (-not (Test-IsAdmin)) {
    Write-Host "This script needs to be run with Administrator privileges." -ForegroundColor Red
    Write-Host "Please right-click the PowerShell icon and select 'Run as administrator'." -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit
}

Write-Host "Setting up Windows Firewall rules for volo-app development..." -ForegroundColor Cyan
Write-Host "This needs to be done only once." -ForegroundColor Cyan
Write-Host ""

# --- Remove old rules to ensure a clean state ---
Write-Host "Removing any existing volo-app firewall rules..."
# Use -ErrorAction SilentlyContinue to prevent errors if the rule doesn't exist
Remove-NetFirewallRule -DisplayName 'volo-app*' -ErrorAction SilentlyContinue
Write-Host "Old rules removed." -ForegroundColor Green
Write-Host ""


# --- Rule for Node.js Development Server ---
Write-Host "Creating firewall rule for Node.js server (Ports 5500-9999)..."
New-NetFirewallRule -Direction Inbound -Action Allow -Protocol TCP -LocalPort "5500-9999" -Program "node.exe" -Profile "Private" -DisplayName 'volo-app Development Server (Node.js)'
Write-Host "Node.js rule created successfully." -ForegroundColor Green
Write-Host ""


# --- Rule for Embedded PostgreSQL Database ---
Write-Host "Creating firewall rule for PostgreSQL database (Port 5432)..."
New-NetFirewallRule -Direction Inbound -Action Allow -Protocol TCP -LocalPort "5432" -Program "any" -Profile "Private" -DisplayName 'volo-app Embedded Database (PostgreSQL)'
Write-Host "PostgreSQL rule created successfully." -ForegroundColor Green
Write-Host ""


# --- Final Confirmation ---
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "Firewall setup is complete!" -ForegroundColor Green
Write-Host "You should not need to run this script again." -ForegroundColor Green
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host ""
Read-Host "Press Enter to exit"