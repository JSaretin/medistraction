#!/bin/bash

set -e

echo "☕ Installing Java 21 for Android builds..."
echo ""

# Add PPA for Java 21
echo "📥 Adding Java PPA repository..."
sudo add-apt-repository -y ppa:openjdk-r/ppa || true

# Update and install Java 21
echo "📥 Installing Java 21..."
sudo apt update
sudo apt install -y openjdk-21-jdk

# Verify installation
echo ""
echo "✅ Java 21 installed successfully!"
/usr/lib/jvm/java-21-openjdk-amd64/bin/java -version

echo ""
echo "✅ Setup complete!"
echo ""
echo "📱 Now you can build your APK:"
echo "   cd ~/Documents/projects/meditract"
echo "   npm run build:apk"
echo ""
