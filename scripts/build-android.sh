#!/bin/bash
# Build the Prompt Optimizer Android app
set -e

echo "==> Building web app..."
cd "$(dirname "$0")/../frontend"
yarn build

echo "==> Syncing with Capacitor..."
npx cap sync android

echo "==> Done! Open Android Studio with: cd frontend && npx cap open android"
echo "==> Or build APK: cd frontend/android && ./gradlew assembleRelease"
