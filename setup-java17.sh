#!/bin/bash

set -e

echo "☕ Setting up Java 17 for Android builds..."
echo ""

# Install Java 17
echo "📥 Installing Java 17..."
sudo apt update
sudo apt install -y openjdk-17-jdk

# Verify installation
echo ""
echo "✅ Java 17 installed successfully!"
java -version

# Update alternatives (optional - if you want to switch default)
read -p "Do you want to set Java 17 as your default Java? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]
then
    sudo update-alternatives --config java
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "📱 Now you can build your APK:"
echo "   cd ~/Documents/projects/meditract"
echo "   npm run build:apk"
echo ""
echo "Or manually:"
echo "   cd ~/Documents/projects/meditract/android"
echo "   ./gradlew assembleDebug"
echo ""
