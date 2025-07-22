# Capacitor Camera Integration

## Overview

The application now uses Capacitor's Camera plugin for handling photo capture and selection on mobile devices, providing a better native experience compared to HTML file inputs.

## Implementation Details

### Components Modified

- `src/components/NewFile/FileOptions.tsx`

### Features Added

1. **Camera Capture**: Direct camera access for taking photos using `CameraSource.Camera`
2. **Gallery Selection**: Photo selection from gallery using `CameraSource.Photos`
3. **Hybrid Approach**:
   - Mobile devices (`device !== "default"`): Use Capacitor Camera API
   - Desktop/Web (`device === "default"`): Fallback to traditional HTML file input

### Functions Added

- `handleCameraCapture()`: Opens camera for photo capture
- `handleGallerySelection()`: Opens photo gallery for selection

### Configuration

- Quality: 90%
- Result Type: DataUrl (base64 encoded)
- No editing allowed for simplicity

### Dependencies

- `@capacitor/camera`: ^5.0.8 (already installed)

### Platform Support

- **Android**: Full camera and gallery support
- **iOS**: Full camera and gallery support
- **Web**: Fallback to HTML file input

### Error Handling

- User cancellation is handled gracefully (no error toast)
- Other errors show appropriate error messages
- File validation maintains the same constraints (size, type)

## Usage

1. **Camera Button**: Directly opens device camera
2. **Choose File Button**:
   - Mobile: Opens photo gallery
   - Desktop: Opens file dialog

Both methods convert selected/captured images to File objects for consistency with the existing upload workflow.
