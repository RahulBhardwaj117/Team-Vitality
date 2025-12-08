# MongoDB Atlas Connection Setup Helper
# This script helps you configure MongoDB Atlas connection

Write-Host "🌐 MongoDB Atlas Connection Setup" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan
Write-Host ""

$envFile = ".\backend\.env"

# Check if .env exists
if (Test-Path $envFile) {
    Write-Host "✅ Found existing .env file" -ForegroundColor Green
    Write-Host ""
    
    # Read current MONGODB_URI
    $envContent = Get-Content $envFile -Raw
    if ($envContent -match 'MONGODB_URI=(.+)') {
        $currentUri = $matches[1].Trim()
        
        if ($currentUri -match 'mongodb\+srv://') {
            Write-Host "✅ MongoDB Atlas connection string detected!" -ForegroundColor Green
            Write-Host "Current URI: $($currentUri.Substring(0, [Math]::Min(50, $currentUri.Length)))..." -ForegroundColor Gray
            Write-Host ""
            
            # Test connection
            Write-Host "Testing connection..." -ForegroundColor Yellow
            Set-Location .\backend
            
            $testResult = node -e "require('mongoose').connect('$currentUri').then(() => { console.log('SUCCESS'); process.exit(0); }).catch(e => { console.log('FAILED: ' + e.message); process.exit(1); })" 2>&1
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "✅ MongoDB Atlas connection successful!" -ForegroundColor Green
                Write-Host ""
                Write-Host "You're all set! Starting the backend server..." -ForegroundColor Green
                Write-Host ""
                npm start
            } else {
                Write-Host "❌ Connection failed: $testResult" -ForegroundColor Red
                Write-Host ""
                Write-Host "Common issues:" -ForegroundColor Yellow
                Write-Host "1. Check your username and password in the connection string" -ForegroundColor White
                Write-Host "2. Make sure your IP address is whitelisted in MongoDB Atlas" -ForegroundColor White
                Write-Host "3. Verify the database name in the connection string" -ForegroundColor White
                Write-Host ""
                
                $updateChoice = Read-Host "Would you like to update the connection string? (y/n)"
                if ($updateChoice -eq 'y') {
                    Write-Host ""
                    Write-Host "Please enter your MongoDB Atlas connection string:" -ForegroundColor Yellow
                    Write-Host "(Format: mongodb+srv://username:password@cluster.xxxxx.mongodb.net/dbname)" -ForegroundColor Gray
                    $newUri = Read-Host "Connection String"
                    
                    # Update .env file
                    $envContent = $envContent -replace 'MONGODB_URI=.+', "MONGODB_URI=$newUri"
                    Set-Content -Path $envFile -Value $envContent
                    
                    Write-Host "✅ Updated connection string" -ForegroundColor Green
                    Write-Host ""
                    Write-Host "Starting backend server..." -ForegroundColor Green
                    npm start
                }
            }
        } else {
            Write-Host "⚠️  Local MongoDB URI detected: $currentUri" -ForegroundColor Yellow
            Write-Host ""
            Write-Host "You mentioned using MongoDB Atlas. Let's update the connection string." -ForegroundColor Yellow
            Write-Host ""
            Write-Host "Please enter your MongoDB Atlas connection string:" -ForegroundColor Yellow
            Write-Host "(Format: mongodb+srv://username:password@cluster.xxxxx.mongodb.net/dbname)" -ForegroundColor Gray
            $newUri = Read-Host "Connection String"
            
            # Update .env file
            $envContent = $envContent -replace 'MONGODB_URI=.+', "MONGODB_URI=$newUri"
            Set-Content -Path $envFile -Value $envContent
            
            Write-Host "✅ Updated to MongoDB Atlas connection" -ForegroundColor Green
            Write-Host ""
            Write-Host "Starting backend server..." -ForegroundColor Green
            Set-Location .\backend
            npm start
        }
    } else {
        Write-Host "⚠️  No MONGODB_URI found in .env file" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Please enter your MongoDB Atlas connection string:" -ForegroundColor Yellow
        Write-Host "(Format: mongodb+srv://username:password@cluster.xxxxx.mongodb.net/dbname)" -ForegroundColor Gray
        $newUri = Read-Host "Connection String"
        
        # Add to .env file
        Add-Content -Path $envFile -Value "`nMONGODB_URI=$newUri"
        
        Write-Host "✅ Added MongoDB Atlas connection" -ForegroundColor Green
        Write-Host ""
        Write-Host "Starting backend server..." -ForegroundColor Green
        Set-Location .\backend
        npm start
    }
} else {
    Write-Host "⚠️  No .env file found" -ForegroundColor Yellow
    Write-Host "Creating .env file from template..." -ForegroundColor Yellow
    
    if (Test-Path ".\backend\.env.example") {
        Copy-Item ".\backend\.env.example" $envFile
        Write-Host "✅ Created .env file" -ForegroundColor Green
    } else {
        # Create minimal .env file
        $minimalEnv = @"
# AgriUrbanAI Backend Environment Variables
NODE_ENV=development
PORT=5000

# MongoDB Atlas Connection
MONGODB_URI=

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRE=7d

# OpenAI API Key (for chatbot)
OPENAI_API_KEY=

# Weather API
OPENWEATHER_API_KEY=
"@
        Set-Content -Path $envFile -Value $minimalEnv
        Write-Host "✅ Created minimal .env file" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "Please enter your MongoDB Atlas connection string:" -ForegroundColor Yellow
    Write-Host "(Format: mongodb+srv://username:password@cluster.xxxxx.mongodb.net/dbname)" -ForegroundColor Gray
    $newUri = Read-Host "Connection String"
    
    # Update .env file
    $envContent = Get-Content $envFile -Raw
    $envContent = $envContent -replace 'MONGODB_URI=.*', "MONGODB_URI=$newUri"
    Set-Content -Path $envFile -Value $envContent
    
    Write-Host "✅ Configured MongoDB Atlas connection" -ForegroundColor Green
    Write-Host ""
    Write-Host "Starting backend server..." -ForegroundColor Green
    Set-Location .\backend
    npm start
}
