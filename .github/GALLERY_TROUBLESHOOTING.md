# Gallery Selection Troubleshooting Guide

## Common Issues and Solutions

### 1. **Gallery Selection Failing**

The gallery selection might fail for several reasons:

#### **Check Browser Console**

Open the browser developer tools (F12) and check the console for error messages when trying to select from gallery.

#### **Platform Detection**

- The app automatically detects the platform using `AppGeneral.getDeviceType()`
- For `device === "default"` (web/desktop): Uses HTML file input
- For mobile devices: Uses Capacitor Camera API with fallback

#### **Capacitor Availability**

The app now checks if Capacitor is available:

```javascript
const isCameraAvailable = async () => {
  try {
    const { Capacitor } = await import('@capacitor/core');
    return Capacitor.isNativePlatform();
  } catch (error) {
    return false;
  }
};
```

### 2. **Error Messages and Solutions**

#### **"Camera not available"**

- **Cause**: Running on web browser or Capacitor not properly configured
- **Solution**: Will automatically fallback to file input

#### **"User cancelled"**

- **Cause**: User dismissed the gallery picker
- **Solution**: No error shown (expected behavior)

#### **"Failed to select photo"**

- **Cause**: Unexpected error during photo selection
- **Solution**: Check console logs for specific error details

### 3. **Testing Steps**

#### **For Web Browser Testing:**

1. Open browser developer tools
2. Click "Choose File" button
3. Should use HTML file input (not Capacitor)
4. Check console for "Capacitor available: false"

#### **For Mobile Device Testing:**

1. Build and deploy to actual device: `npm run build && npx cap sync`
2. Click "Choose File" button
3. Should open native gallery picker
4. Check console for "Capacitor available: true"

#### **For Android Testing:**

```bash
npx cap run android
```

### 4. **Debug Information**

The following console logs are now available:

- `Gallery selection started...`
- `Capacitor available: [true/false]`
- `Attempting to open gallery...`
- `Gallery selection successful, image received: [true/false]`
- `File type detected: [mime-type]`
- `File created successfully: [filename] [size]`

### 5. **Fallback Behavior**

The app now has multiple fallback layers:

1. **Primary**: Capacitor Camera API (mobile devices)
2. **Fallback 1**: HTML file input (when Capacitor unavailable)
3. **Fallback 2**: Error message with option to use file upload

### 6. **File Type Support**

Supports automatic detection of:

- JPEG/JPG (default)
- PNG
- WebP
- Other formats fall back to JPEG

### 7. **Manual Testing Commands**

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Sync with Capacitor (after build)
npx cap sync

# Run on Android
npx cap run android

# Open Android Studio for debugging
npx cap open android
```
