# Govt Invoice Billing App - PWA Enhanced

A Progressive Web Application (PWA) for government invoice billing with comprehensive offline capabilities and modern web app features.

## ✨ PWA Features

### 🔧 Installation & Updates
- **App Installation**: Installable on any device from browsers
- **Auto Updates**: Automatic service worker updates with user notifications
- **Cross-Platform**: Works on desktop, mobile, and tablets

### 🌐 Offline Capabilities
- **Offline Indicator**: Visual status indicator for connection state
- **Background Sync**: Queue form submissions when offline, sync when online
- **Offline Storage**: Local data persistence with IndexedDB for invoices, customers, and drafts
- **Offline Fallback**: Custom pages for offline-only content

### 📱 Native App Experience
- **App Shortcuts**: Quick access to create invoice, view invoices, and manage customers
- **Standalone Display**: Full-screen app experience when installed
- **App-like UI**: Native-feeling interface with proper theming

### 🔔 Notifications (Optional)
- **Push Notifications**: Server-sent notifications support
- **Local Notifications**: App-generated notifications
- **Permission Management**: User-controlled notification preferences

### 🎨 Enhanced Manifest
- **Rich Metadata**: Comprehensive app information for app stores
- **Multiple Icons**: Optimized icons for all device types including maskable icons
- **Screenshots**: App store ready screenshots
- **Categories**: Properly categorized as business/finance/productivity app

## 🚀 Getting Started

### Prerequisites
- Node.js 16+ 
- npm or yarn

### Installation
```bash
# Clone the repository
git clone <repository-url>
cd Govt-billing-solution-MVP

# Install dependencies
npm install

# Generate PWA assets (if needed)
npm run generate-pwa-assets

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### PWA Testing
1. **Development**: PWA features work in dev mode with `devOptions.enabled: true`
2. **Production**: Build and serve the app to test full PWA functionality
3. **Installation**: Look for browser install prompts or use browser settings

## 📦 Build & Deployment

### Production Build
```bash
npm run build
```

### PWA Verification
After building, verify PWA features:
1. Check `dist/manifest.webmanifest` exists
2. Verify service worker at `dist/sw.js`
3. Test installation prompt in supported browsers
4. Verify offline functionality

### Deployment Checklist
- [ ] HTTPS enabled (required for PWA)
- [ ] Service worker accessible
- [ ] Manifest file properly linked
- [ ] Icons and assets available
- [ ] Offline fallbacks working

## 🔧 PWA Configuration

### Service Worker (VitePWA)
- **Auto Update**: Service worker updates automatically
- **Precaching**: All app assets are precached
- **Runtime Caching**: API responses and images cached
- **Background Sync**: Offline form submissions

### Manifest Features
- **App Shortcuts**: Quick actions for common tasks
- **Display Modes**: Standalone, minimal-ui fallbacks
- **Orientation**: Portrait-primary for mobile optimization
- **Categories**: Business, finance, productivity

### Offline Storage
```typescript
// Example usage
import { useOfflineStorage } from './utils/offlineStorage';

const { saveInvoice, getInvoice, getAllInvoices } = useOfflineStorage();

// Save invoice offline
await saveInvoice('invoice-123', invoiceData);

// Retrieve when online/offline
const invoice = await getInvoice('invoice-123');
```

### Background Sync
```typescript
// Example usage
import { useBackgroundSync } from './utils/backgroundSync';

const { queueFormSubmission } = useBackgroundSync();

// Automatically handles online/offline submission
await queueFormSubmission('/api/invoices', formData);
```

## 📱 PWA Components

### Installation Prompt
```tsx
import PWAInstallPrompt from './components/PWAInstallPrompt';
// Automatically shows when app is installable
```

### Update Notifications
```tsx
import PWAUpdatePrompt from './components/PWAUpdatePrompt';
// Shows when updates are available
```

### Offline Indicator
```tsx
import OfflineIndicator from './components/OfflineIndicator';
// Shows connection status
```

### Push Notifications
```tsx
import { usePushNotifications } from './utils/pushNotifications';
const { requestPermission, subscribe } = usePushNotifications();
```

## 🛠 Technology Stack

- **React 18** - UI framework
- **Ionic 8** - Mobile UI components
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **VitePWA** - PWA plugin for Vite
- **Workbox** - Service worker management
- **IndexedDB** - Offline data storage

## 📊 PWA Audit

Use Lighthouse or Chrome DevTools to audit PWA features:
1. Performance: 90+
2. Accessibility: 90+
3. Best Practices: 90+
4. SEO: 90+
5. PWA: All checks passing


---

**Note**: Remember to replace `YOUR_VAPID_PUBLIC_KEY` in `src/utils/pushNotifications.ts` with your actual VAPID public key for push notifications to work properly.