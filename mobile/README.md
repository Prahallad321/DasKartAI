# Nova AI - Flutter Mobile App

This directory contains the Flutter implementation of the Nova AI Voice Assistant for Android and iOS.

## Prerequisites
1. Flutter SDK installed
2. Android Studio (for Android) or Xcode (for iOS)
3. Gemini API Key

## Setup

1. **Navigate to directory**:
   ```bash
   cd mobile
   ```

2. **Install dependencies**:
   ```bash
   flutter pub get
   ```

3. **Configure API Key**:
   Open `lib/services/gemini_service.dart` and set `_apiKey` or run with:
   ```bash
   flutter run --dart-define=API_KEY=YOUR_API_KEY
   ```

## Platform Specific Configuration

### iOS (`ios/Runner/Info.plist`)
Add the following keys for permissions:
```xml
<key>NSMicrophoneUsageDescription</key>
<string>Nova needs access to microphone for voice conversation.</string>
<key>NSCameraUsageDescription</key>
<string>Nova needs access to camera to see what you show it.</string>
```

### Android (`android/app/src/main/AndroidManifest.xml`)
Add the following permissions:
```xml
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.CAMERA" />
```
