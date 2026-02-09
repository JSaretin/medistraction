# Building APK Without Android Studio

## Option 1: Install Android Command Line Tools (Recommended)

### 1. Download Android Command Line Tools

```bash
# Create Android SDK directory
mkdir -p ~/Android/Sdk/cmdline-tools
cd ~/Android/Sdk/cmdline-tools

# Download the latest command line tools
wget https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip

# Unzip
unzip commandlinetools-linux-11076708_latest.zip

# Move to correct location
mkdir latest
mv cmdline-tools/* latest/
rm -rf cmdline-tools
```

### 2. Set Environment Variables

Add these to your `~/.bashrc` or `~/.zshrc`:

```bash
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/build-tools/34.0.0
```

Then reload:
```bash
source ~/.bashrc  # or source ~/.zshrc
```

### 3. Install Required SDK Components

```bash
# Accept licenses
yes | sdkmanager --licenses

# Install required components
sdkmanager "platform-tools" "platforms;android-34" "build-tools;34.0.0"
```

### 4. Build the APK

Navigate to your project and build:

```bash
cd ~/Documents/projects/meditract
npm run build && npx cap sync

# Build debug APK
cd android
./gradlew assembleDebug

# The APK will be at:
# android/app/build/outputs/apk/debug/app-debug.apk
```

### 5. Install APK on Device

```bash
# Copy to your device and install, or use adb:
adb install app/build/outputs/apk/debug/app-debug.apk
```

---

## Option 2: Use Docker (Easiest, No Local Setup)

Create a `Dockerfile` in your project:

```dockerfile
FROM openjdk:11-slim

# Install dependencies
RUN apt-get update && apt-get install -y \
    wget \
    unzip \
    git \
    nodejs \
    npm

# Install Android SDK
ENV ANDROID_HOME=/opt/android-sdk
RUN mkdir -p ${ANDROID_HOME}/cmdline-tools && \
    cd ${ANDROID_HOME}/cmdline-tools && \
    wget https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip && \
    unzip commandlinetools-linux-11076708_latest.zip && \
    mkdir latest && \
    mv cmdline-tools/* latest/ && \
    rm commandlinetools-linux-11076708_latest.zip

ENV PATH=${PATH}:${ANDROID_HOME}/cmdline-tools/latest/bin:${ANDROID_HOME}/platform-tools

# Accept licenses and install components
RUN yes | sdkmanager --licenses && \
    sdkmanager "platform-tools" "platforms;android-34" "build-tools;34.0.0"

WORKDIR /app

# Copy project
COPY . .

# Install dependencies and build
RUN npm install && npm run build && npx cap sync

# Build APK
WORKDIR /app/android
RUN ./gradlew assembleDebug

# Output is at: /app/android/app/build/outputs/apk/debug/app-debug.apk
```

Build with Docker:
```bash
docker build -t meditract-builder .
docker create --name meditract-build meditract-builder
docker cp meditract-build:/app/android/app/build/outputs/apk/debug/app-debug.apk ./
docker rm meditract-build
```

---

## Option 3: Use GitHub Actions (Cloud Build)

Create `.github/workflows/build-apk.yml`:

```yaml
name: Build Android APK

on:
  workflow_dispatch:  # Manual trigger

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Setup Java
        uses: actions/setup-java@v3
        with:
          distribution: 'temurin'
          java-version: '11'

      - name: Install dependencies
        run: npm install

      - name: Build web app
        run: npm run build

      - name: Sync Capacitor
        run: npx cap sync

      - name: Build APK
        run: |
          cd android
          ./gradlew assembleDebug

      - name: Upload APK
        uses: actions/upload-artifact@v3
        with:
          name: app-debug
          path: android/app/build/outputs/apk/debug/app-debug.apk
```

Then:
1. Push to GitHub
2. Go to Actions tab
3. Run "Build Android APK" workflow
4. Download the APK artifact

---

## Quick Install Script (Option 1 Automated)

Save this as `install-android-sdk.sh`:

```bash
#!/bin/bash

# Create directories
mkdir -p ~/Android/Sdk/cmdline-tools
cd ~/Android/Sdk/cmdline-tools

# Download and extract
wget https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip
unzip commandlinetools-linux-11076708_latest.zip
mkdir latest
mv cmdline-tools/* latest/
rm commandlinetools-linux-11076708_latest.zip

# Add to bashrc
echo 'export ANDROID_HOME=$HOME/Android/Sdk' >> ~/.bashrc
echo 'export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin' >> ~/.bashrc
echo 'export PATH=$PATH:$ANDROID_HOME/platform-tools' >> ~/.bashrc
echo 'export PATH=$PATH:$ANDROID_HOME/build-tools/34.0.0' >> ~/.bashrc

# Reload
source ~/.bashrc

# Install SDK components
yes | ~/Android/Sdk/cmdline-tools/latest/bin/sdkmanager --licenses
~/Android/Sdk/cmdline-tools/latest/bin/sdkmanager "platform-tools" "platforms;android-34" "build-tools;34.0.0"

echo "Android SDK installed! Close and reopen your terminal, then run:"
echo "cd ~/Documents/projects/meditract && npm run build && npx cap sync && cd android && ./gradlew assembleDebug"
```

Run it:
```bash
chmod +x install-android-sdk.sh
./install-android-sdk.sh
```

---

## Recommended: Option 1 or GitHub Actions

- **Option 1**: Good if you'll build frequently
- **Option 2 (Docker)**: Good for one-time builds, but large download
- **Option 3 (GitHub)**: Best for cloud builds, no local setup needed

Choose based on your needs!
