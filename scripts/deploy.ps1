# AI Toolbox Backend - Local Production Mode Runner (PowerShell)
# Use this script to run the backend service locally using production settings.

param(
    [switch]$Force,
    [switch]$NoBuild
)

# --- Configuration ---
$ErrorActionPreference = "Stop"
$COMPOSE_FILE = "docker-compose.prod.yml"

# --- Logging Functions ---
function Log-Info { param([string]$Message) Write-Host "[INFO] $Message" -ForegroundColor Cyan }
function Log-Success { param([string]$Message) Write-Host "[SUCCESS] $Message" -ForegroundColor Green }
function Log-Warning { param([string]$Message) Write-Host "[WARNING] $Message" -ForegroundColor Yellow }
function Log-Error { param([string]$Message) Write-Host "[ERROR] $Message" -ForegroundColor Red }

# --- Helper Functions ---

function Test-Dependencies {
    Log-Info "Checking dependencies..."
    try {
        $null = Get-Command docker -ErrorAction Stop
        $null = Get-Command docker-compose -ErrorAction Stop
        Log-Success "Docker and Docker Compose are available."
    } catch {
        Log-Error "Docker or Docker Compose is not installed or not in PATH."
        Log-Info "Please install Docker Desktop from: https://www.docker.com/products/docker-desktop/"
        exit 1
    }
    
    # Check if Docker Desktop is running
    Log-Info "Checking Docker Desktop status..."
    
    # Suppress all error handling to avoid PowerShell exceptions
    $ErrorActionPreference = "SilentlyContinue"
    $dockerInfo = docker info 2>&1
    $dockerExitCode = $LASTEXITCODE
    $ErrorActionPreference = "Stop"
    
    if ($dockerExitCode -ne 0) {
        # Docker command failed - likely not running
        if ($dockerInfo -match "docker daemon|Docker Desktop|cannot connect|error during connect") {
            Log-Warning "Docker Desktop is not running."
            Log-Info "Please start Docker Desktop and wait for it to fully initialize."
            Log-Info "You can find Docker Desktop in your Start Menu or system tray."
            
            # Try to check WSL2 status
            Test-WSL2Status
            
            Log-Info "After starting Docker Desktop, press Enter to continue..."
            Read-Host
            
            # Test again
            docker info *>$null
            if ($LASTEXITCODE -ne 0) {
                Log-Error "Docker Desktop is still not responding. Please ensure it's running properly."
                exit 1
            }
        } else {
            Log-Error "Docker daemon is not accessible: $dockerInfo"
            exit 1
        }
    } else {
        # Docker is running successfully (exit code 0)
        # Check for warnings but don't treat them as errors
        $warnings = $dockerInfo | Select-String "WARNING"
        if ($warnings) {
            Log-Warning "Docker is running with some limitations in WSL2 environment:"
            foreach ($warning in $warnings) {
                Log-Warning "  $($warning.Line.Trim())"
            }
            Log-Info "These warnings are common in Windows WSL2 environment and usually don't affect functionality."
        }
        Log-Success "Docker Desktop is running and accessible."
    }
}

function Test-WSL2Status {
    Log-Info "Checking WSL2 status..."
    try {
        $wslList = wsl --list --verbose 2>&1
        if ($LASTEXITCODE -eq 0) {
            Log-Info "WSL2 distributions:"
            Write-Host $wslList
            
            # Check if any WSL2 distributions are running
            if ($wslList -match "Running") {
                Log-Success "WSL2 distributions are running."
            } else {
                Log-Warning "No WSL2 distributions are currently running."
                Log-Info "Docker Desktop may need WSL2 to be running. You can start it with: wsl"
            }
        } else {
            Log-Warning "WSL2 is not available or not installed."
            Log-Info "Docker Desktop can use WSL2 backend. Consider enabling it in Docker Desktop settings."
        }
    } catch {
        Log-Warning "Could not check WSL2 status: $($_.Exception.Message)"
    }
}

function Initialize-Environment {
    Log-Info "Checking environment configuration..."
    $envPath = "backend/.env"
    $templatePath = "backend/env.production.template"
    
    if (-not (Test-Path $envPath)) {
        Log-Warning "'$envPath' not found."
        if (Test-Path $templatePath) {
            Log-Info "Copying from template '$templatePath'..."
            Copy-Item $templatePath $envPath
            Log-Warning "IMPORTANT: Please edit 'backend/.env' and fill in the required values."
            Log-Info "You can generate a secure SECRET_KEY with: python -c ""import secrets; print(secrets.token_urlsafe(32))"""
            if (-not $Force) {
                Read-Host "Press Enter to continue after you have configured the .env file"
            }
        } else {
            Log-Error "Environment template not found at '$templatePath'. Cannot proceed."
            exit 1
        }
    }
    Log-Success "Environment configuration is ready."
}

function Start-Service {
    Log-Info "Starting services in production mode using '$COMPOSE_FILE'..."
    
    # Final Docker connectivity test
    Log-Info "Performing final Docker connectivity test..."
    try {
        $dockerTestOutput = docker run --rm hello-world 2>&1
        if ($LASTEXITCODE -ne 0) {
            # Check if it's a warning or actual error
            if ($dockerTestOutput -match "Hello from Docker") {
                Log-Success "Docker connectivity test passed (with warnings)."
                if ($dockerTestOutput -match "WARNING") {
                    Log-Warning "Some Docker warnings detected (common in WSL2):"
                    $dockerTestOutput | Select-String "WARNING" | ForEach-Object { Log-Warning $_.Line.Trim() }
                }
            } else {
                throw "Docker connectivity test failed: $dockerTestOutput"
            }
        } else {
            Log-Success "Docker connectivity test passed."
        }
    } catch {
        Log-Error "Docker connectivity test failed. Please ensure Docker Desktop is properly running."
        Log-Info "Try running 'docker run hello-world' manually to diagnose the issue."
        Log-Error "Error details: $($_.Exception.Message)"
        throw "Docker connectivity test failed"
    }
    
    if (-not $NoBuild) {
        Log-Info "Building images..."
        try {
            docker-compose -f $COMPOSE_FILE build
            if ($LASTEXITCODE -ne 0) { 
                throw "Docker build failed. Please check Docker Desktop status and try again." 
            }
            Log-Success "Images built successfully."
        } catch {
            Log-Error "Build failed: $($_.Exception.Message)"
            Log-Info "Common solutions:"
            Log-Info "1. Ensure Docker Desktop is running and fully initialized"
            Log-Info "2. Try restarting Docker Desktop"
            Log-Info "3. Check if WSL2 backend is working properly"
            throw "Docker build failed"
        }
    } else {
        Log-Info "Skipping build as per --NoBuild flag."
    }

    Log-Info "Starting containers..."
    docker-compose -f $COMPOSE_FILE up -d
    if ($LASTEXITCODE -ne 0) { throw "Failed to start services." }

    Log-Success "Services started successfully."
    Log-Info "Run 'docker-compose -f $COMPOSE_FILE logs -f' to see the logs."
    Log-Info "Run 'docker-compose -f $COMPOSE_FILE down' to stop the services."
    
    # Show running containers
    Log-Info "Running containers:"
    docker-compose -f $COMPOSE_FILE ps
}

# --- Main Execution ---

function Main {
    Log-Info "🚀 Starting AI Toolbox in Local Production Mode..."
    
    Test-Dependencies
    Initialize-Environment
    Start-Service
    
    Log-Success "🎉 All services are up and running."
}

# --- Error Handling ---
trap {
    Log-Error "Script failed: $($_.Exception.Message)"
    Log-Info "Attempting to stop running services..."
    docker-compose -f $COMPOSE_FILE down --remove-orphans 2>$null
    exit 1
}

# --- Run ---
Main
