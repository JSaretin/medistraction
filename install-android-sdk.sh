#!/bin/bash

set -e

echo "📱 Installing Android SDK Command Line Tools..."

# Create directories
mkdir -p ~/Android/Sdk/cmdline-tools
cd ~/Android/Sdk/cmdline-tools

# Download and extract
echo "⬇️  Downloading Android command line tools..."
wget -q --show-progress https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip

echo "📦 Extracting..."
unzip -q commandlinetools-linux-11076708_latest.zip
mkdir -p latest
mv cmdline-tools/* latest/ 2>/dev/null || true
rm commandlinetools-linux-11076708_latest.zip

# Detect shell config file
if [ -f ~/.zshrc ]; then
    SHELL_CONFIG=~/.zshrc
else
    SHELL_CONFIG=~/.bashrc
fi

# Add to shell config if not already there
if ! grep -q "ANDROID_HOME" "$SHELL_CONFIG"; then
    echo "" >> "$SHELL_CONFIG"
    echo "# Android SDK" >> "$SHELL_CONFIG"
    echo 'export ANDROID_HOME=$HOME/Android/Sdk' >> "$SHELL_CONFIG"
    echo 'export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin' >> "$SHELL_CONFIG"
    echo 'export PATH=$PATH:$ANDROID_HOME/platform-tools' >> "$SHELL_CONFIG"
    echo 'export PATH=$PATH:$ANDROID_HOME/build-tools/34.0.0' >> "$SHELL_CONFIG"
    echo "✅ Added Android SDK to $SHELL_CONFIG"
fi

# Set for current session
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/build-tools/34.0.0

# Install SDK components
echo "📥 Installing Android SDK components..."
yes | $ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager --licenses > /dev/null 2>&1
$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager "platform-tools" "platforms;android-34" "build-tools;34.0.0"

echo ""
echo "✅ Android SDK installed successfully!"
echo ""
echo "📝 Next steps:"
echo "1. Close and reopen your terminal (to load new environment variables)"
echo "2. Run these commands to build your APK:"
echo ""
echo "   cd ~/Documents/projects/meditract"
echo "   npm run build && npx cap sync"
echo "   cd android"
echo "   ./gradlew assembleDebug"
echo ""
echo "3. Your APK will be at: android/app/build/outputs/apk/debug/app-debug.apk"
echo ""
