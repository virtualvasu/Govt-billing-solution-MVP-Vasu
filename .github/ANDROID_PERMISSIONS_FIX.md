# Android Permissions Fix for Camera/Gallery Access

## Issue Resolved

Fixed the error: `Missing the following permissions in AndroidManifest.xml: android.permission.READ_MEDIA_IMAGES`

## Permissions Added

### AndroidManifest.xml Updates

The following permissions have been added to `/android/app/src/main/AndroidManifest.xml`:

```xml
<!-- Permissions for Camera Plugin -->
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />

<!-- Permissions for accessing media images (Android 13+) -->
<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />

<!-- Permissions for accessing external storage (Android 12 and below) -->
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />

<!-- Camera feature declaration -->
<uses-feature android:name="android.hardware.camera" android:required="false" />
<uses-feature android:name="android.hardware.camera.autofocus" android:required="false" />
```

### Permission Explanations

1. **CAMERA**: Required for taking photos with the camera
2. **READ_MEDIA_IMAGES**: Required for Android 13+ to access gallery images
3. **READ_EXTERNAL_STORAGE**: Required for Android 12 and below to access gallery
4. **WRITE_EXTERNAL_STORAGE**: Required for saving images temporarily
5. **Camera Features**: Declares camera hardware usage (optional for compatibility)

## Enhanced Error Handling

The app now provides better error messages for permission issues:

- **Permission Denied**: Clear message directing users to app settings
- **Automatic Fallback**: Falls back to file input when permissions are denied
- **User-Friendly Messages**: Specific guidance for different error scenarios

## Testing Steps

### 1. Build and Deploy

```bash
# Build the project
npm run build

# Sync with Capacitor (applies new permissions)
npx cap sync android

# Open in Android Studio for testing
npx cap open android
```

### 2. Runtime Permission Testing

#### First Time Usage:

1. Open the app on Android device
2. Click "Add Logo" → "Choose File" or "Camera"
3. Android will prompt for permissions
4. Grant camera and storage permissions

#### Permission Denied Testing:

1. Go to Android Settings → Apps → [Your App] → Permissions
2. Deny camera/storage permissions
3. Try to use camera/gallery features
4. App should show helpful error message and fallback to file input

### 3. Android Version Compatibility

- **Android 13+**: Uses `READ_MEDIA_IMAGES` permission
- **Android 12 and below**: Uses `READ_EXTERNAL_STORAGE` permission
- **All versions**: Uses `CAMERA` permission for camera access

## Manual Permission Grant (if needed)

If permissions are not automatically granted:

1. **Settings** → **Apps** → **[Your App Name]**
2. **Permissions**
3. Enable:
   - **Camera** (for taking photos)
   - **Photos and media** or **Storage** (for gallery access)

## Development Commands

```bash
# Clean build (if having issues)
npm run build
npx cap sync android
npx cap clean android

# Run on Android device
npx cap run android

# Open Android Studio for debugging
npx cap open android

# Check Android logs
npx cap run android --live-reload --external
```

## Expected Behavior After Fix

1. **Gallery Selection**: Should open native Android gallery
2. **Camera Capture**: Should open native Android camera
3. **Permission Prompts**: Android will ask for permissions on first use
4. **Graceful Fallback**: File input opens if permissions denied
5. **Clear Error Messages**: User-friendly guidance for permission issues

## Troubleshooting

### If permissions still don't work:

1. Uninstall the app completely
2. Rebuild and reinstall: `npm run build && npx cap sync android && npx cap run android`
3. Fresh install will prompt for new permissions

### Check permission status programmatically:

The app automatically detects and handles permission states, providing fallbacks when needed.

## File Changes Made

1. **AndroidManifest.xml**: Added required permissions
2. **FileOptions.tsx**: Enhanced error handling for permission issues
3. **Capacitor Sync**: Applied changes to Android project

The gallery selection should now work properly on Android devices with proper permission handling!
