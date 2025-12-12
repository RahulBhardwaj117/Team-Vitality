# AgriUrbanAI APK Builder Script
# This script downloads Android SDK command-line tools and builds the APK

$ErrorActionPreference = "Stop"

Write-Host "`n=== AgriUrbanAI APK Builder ===" -ForegroundColor Cyan
Write-Host "This script will set up Android SDK and build your APK`n"

# Configuration
$SDK_DIR = "$env:USERPROFILE\Android\Sdk"
$CMDLINE_TOOLS_DIR = "$SDK_DIR\cmdline-tools\latest"
$CMDLINE_TOOLS_URL = "https://dl.google.com/android/repository/commandlinetools-win-11076708_latest.zip"
$TEMP_ZIP = "$env:TEMP\android-cmdline-tools.zip"

# Create SDK directory
Write-Host "[1/5] Creating Android SDK directory..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path $SDK_DIR | Out-Null
New-Item -ItemType Directory -Force -Path "$SDK_DIR\cmdline-tools" | Out-Null

# Download command-line tools if not exists
if (-not (Test-Path "$CMDLINE_TOOLS_DIR\bin\sdkmanager.bat")) {
    Write-Host "[2/5] Downloading Android Command Line Tools..." -ForegroundColor Yellow
    Invoke-WebRequest -Uri $CMDLINE_TOOLS_URL -OutFile $TEMP_ZIP -UseBasicParsing
    
    Write-Host "[3/5] Extracting tools..." -ForegroundColor Yellow
    Expand-Archive -Path $TEMP_ZIP -DestinationPath "$SDK_DIR\cmdline-tools" -Force
    
    # Rename extracted folder to 'latest'
    if (Test-Path "$SDK_DIR\cmdline-tools\cmdline-tools") {
        if (Test-Path $CMDLINE_TOOLS_DIR) {
            Remove-Item -Recurse -Force $CMDLINE_TOOLS_DIR
        }
        Rename-Item "$SDK_DIR\cmdline-tools\cmdline-tools" "latest"
    }
    
    Remove-Item $TEMP_ZIP -ErrorAction SilentlyContinue
} else {
    Write-Host "[2/5] Android Command Line Tools already installed" -ForegroundColor Green
    Write-Host "[3/5] Skipping extraction" -ForegroundColor Green
}

# Set environment variables for current session
$env:ANDROID_HOME = $SDK_DIR
$env:ANDROID_SDK_ROOT = $SDK_DIR
$env:PATH = "$env:PATH;$CMDLINE_TOOLS_DIR\bin;$SDK_DIR\platform-tools"

# Accept licenses and install required packages
Write-Host "[4/5] Installing Android SDK packages (this may take a few minutes)..." -ForegroundColor Yellow

# Accept licenses
Write-Host "Accepting licenses..."
echo "y" | & "$CMDLINE_TOOLS_DIR\bin\sdkmanager.bat" --licenses 2>$null

# Install required packages
Write-Host "Installing platform-tools..."
& "$CMDLINE_TOOLS_DIR\bin\sdkmanager.bat" "platform-tools" 2>$null

Write-Host "Installing build-tools..."
& "$CMDLINE_TOOLS_DIR\bin\sdkmanager.bat" "build-tools;34.0.0" 2>$null

Write-Host "Installing Android platform..."
& "$CMDLINE_TOOLS_DIR\bin\sdkmanager.bat" "platforms;android-34" 2>$null

# Create local.properties in android folder
$LOCAL_PROPS = "sdk.dir=$($SDK_DIR.Replace('\','\\'))"
$LOCAL_PROPS | Out-File -FilePath ".\android\local.properties" -Encoding ASCII -Force
Write-Host "Created local.properties with SDK path: $SDK_DIR" -ForegroundColor Green

# Build the APK
Write-Host "`n[5/5] Building APK..." -ForegroundColor Yellow
Set-Location ".\android"

try {
    & .\gradlew.bat assembleDebug
    
    if ($LASTEXITCODE -eq 0) {
        $APK_PATH = "app\build\outputs\apk\debug\app-debug.apk"
        if (Test-Path $APK_PATH) {
            $DEST_PATH = "..\AgriUrbanAI-debug.apk"
            Copy-Item $APK_PATH $DEST_PATH -Force
            
            Write-Host "`n" -NoNewline
            Write-Host "========================================" -ForegroundColor Green
            Write-Host "   APK BUILD SUCCESSFUL!" -ForegroundColor Green
            Write-Host "========================================" -ForegroundColor Green
            Write-Host "`nYour APK is ready at:" -ForegroundColor Cyan
            Write-Host "  $((Get-Item $DEST_PATH).FullName)" -ForegroundColor White
            Write-Host "`nTransfer this file to your Android phone and install it!" -ForegroundColor Yellow
        }
    } else {
        Write-Host "`nBuild failed. Check the error messages above." -ForegroundColor Red
    }
} catch {
    Write-Host "Build error: $_" -ForegroundColor Red
} finally {
    Set-Location ".."
}
