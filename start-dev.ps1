# AgriUrbanAI Development Startup Script
# This script checks and starts all required services

Write-Host "🚀 AgriUrbanAI Development Startup" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

# Check if MongoDB is running
Write-Host "📊 Checking MongoDB status..." -ForegroundColor Yellow

$mongoRunning = $false

# Method 1: Check if mongod process is running
$mongoProcess = Get-Process -Name mongod -ErrorAction SilentlyContinue
if ($mongoProcess) {
    Write-Host "✅ MongoDB is already running (PID: $($mongoProcess.Id))" -ForegroundColor Green
    $mongoRunning = $true
} else {
    # Method 2: Check if MongoDB service exists and is running
    $mongoService = Get-Service -Name MongoDB -ErrorAction SilentlyContinue
    if ($mongoService -and $mongoService.Status -eq 'Running') {
        Write-Host "✅ MongoDB service is running" -ForegroundColor Green
        $mongoRunning = $true
    } else {
        Write-Host "⚠️  MongoDB is not running" -ForegroundColor Red
        Write-Host ""
        Write-Host "Options:" -ForegroundColor Yellow
        Write-Host "1. Start MongoDB manually: mongod --dbpath C:\data\db" -ForegroundColor White
        Write-Host "2. Install MongoDB from: https://www.mongodb.com/try/download/community" -ForegroundColor White
        Write-Host "3. Use MongoDB Atlas (cloud): https://www.mongodb.com/cloud/atlas" -ForegroundColor White
        Write-Host "4. Continue without database (limited functionality)" -ForegroundColor White
        Write-Host ""
        
        $choice = Read-Host "Enter choice (1-4) or press Enter to continue without DB"
        
        switch ($choice) {
            "1" {
                Write-Host "Starting MongoDB..." -ForegroundColor Yellow
                # Create data directory if it doesn't exist
                $dataPath = "C:\data\db"
                if (-not (Test-Path $dataPath)) {
                    New-Item -ItemType Directory -Path $dataPath -Force | Out-Null
                    Write-Host "Created data directory: $dataPath" -ForegroundColor Green
                }
                
                # Try to start MongoDB
                try {
                    Start-Process -FilePath "mongod" -ArgumentList "--dbpath", $dataPath -WindowStyle Normal
                    Start-Sleep -Seconds 3
                    Write-Host "✅ MongoDB started" -ForegroundColor Green
                    $mongoRunning = $true
                } catch {
                    Write-Host "❌ Failed to start MongoDB: $_" -ForegroundColor Red
                    Write-Host "Please install MongoDB or use cloud option" -ForegroundColor Yellow
                }
            }
            "2" {
                Write-Host "Opening MongoDB download page..." -ForegroundColor Yellow
                Start-Process "https://www.mongodb.com/try/download/community"
                Write-Host "Please install MongoDB and run this script again" -ForegroundColor Yellow
                exit
            }
            "3" {
                Write-Host "Opening MongoDB Atlas..." -ForegroundColor Yellow
                Start-Process "https://www.mongodb.com/cloud/atlas/register"
                Write-Host ""
                Write-Host "After creating your cluster:" -ForegroundColor Yellow
                Write-Host "1. Get your connection string" -ForegroundColor White
                Write-Host "2. Update backend/.env with: MONGODB_URI=<your-connection-string>" -ForegroundColor White
                Write-Host ""
                Read-Host "Press Enter when ready to continue"
            }
            default {
                Write-Host "⚠️  Continuing without database (limited functionality)" -ForegroundColor Yellow
            }
        }
    }
}

Write-Host ""

# Check if port 5000 is available
Write-Host "🔌 Checking port 5000..." -ForegroundColor Yellow
$portInUse = Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue

if ($portInUse) {
    Write-Host "⚠️  Port 5000 is in use" -ForegroundColor Red
    Write-Host "Attempting to free port 5000..." -ForegroundColor Yellow
    
    try {
        npx -y kill-port 5000
        Start-Sleep -Seconds 2
        Write-Host "✅ Port 5000 freed" -ForegroundColor Green
    } catch {
        Write-Host "❌ Could not free port 5000" -ForegroundColor Red
        Write-Host "Using port 5001 instead..." -ForegroundColor Yellow
        $env:PORT = "5001"
    }
} else {
    Write-Host "✅ Port 5000 is available" -ForegroundColor Green
}

Write-Host ""

# Check environment file
Write-Host "📝 Checking environment configuration..." -ForegroundColor Yellow
$envFile = ".\backend\.env"

if (Test-Path $envFile) {
    Write-Host "✅ Environment file found" -ForegroundColor Green
} else {
    Write-Host "⚠️  No .env file found" -ForegroundColor Yellow
    Write-Host "Creating from .env.example..." -ForegroundColor Yellow
    
    if (Test-Path ".\backend\.env.example") {
        Copy-Item ".\backend\.env.example" $envFile
        Write-Host "✅ Created .env file - please update with your API keys" -ForegroundColor Green
    } else {
        Write-Host "❌ No .env.example found" -ForegroundColor Red
    }
}

Write-Host ""

# Start backend server
Write-Host "🚀 Starting backend server..." -ForegroundColor Cyan
Write-Host ""

Set-Location .\backend

# Show status
Write-Host "=================================" -ForegroundColor Cyan
Write-Host "Backend Server Starting..." -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "MongoDB Status: $(if ($mongoRunning) { '✅ Connected' } else { '⚠️  Offline Mode' })" -ForegroundColor $(if ($mongoRunning) { 'Green' } else { 'Yellow' })
Write-Host "Server Port: $(if ($env:PORT) { $env:PORT } else { '5000' })" -ForegroundColor Green
Write-Host ""
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host ""

# Start the server
npm start
