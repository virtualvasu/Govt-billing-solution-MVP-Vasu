# Ionic v5 to v7 Migration with Vite – Project Guide

This project documents the migration of an Ionic v5 application with outdated dependencies to a modern Ionic v7 setup using **Vite** as the build tool. The transition includes full integration of SocialCalc, compatibility fixes for Android, and steps to run the project across web, Android, and iOS platforms.

---

## 🚀 Migration Steps

### 1. Create a New Ionic + Vite App

```bash
npx create-ionic-vite@latest
```

### 2. Transfer Your Code

* Move all relevant source files from the Ionic v5 project to the new Ionic v7 + Vite codebase.

### 3. Resolve Errors

* Address compatibility and dependency issues one by one during migration.

---

## 📊 Integration of SocialCalc

During migration, SocialCalc posed challenges due to switching from UMD to ES6 modules. While the integration worked on the web, it failed in Android builds because the `window` object wasn’t available as expected.

### ✅ Fixes Implemented:

* Reverted to using the UMD version of SocialCalc.
* Manually defined the `window` object in the SocialCalc file.
* Declared missing variables using `var` at the top of the scope to ensure global availability.

These changes ensured compatibility on both web and Android platforms.

---

## 📱 Android Emulator Compatibility Fix

To make SocialCalc work on Android:

* Ensure **all undeclared variables** in SocialCalc are explicitly declared using `var`.
* Simulate or define a `window` object where necessary.

---

## 🌐 Running the Project on Web

### 1. Clone the Repository

```bash
git clone REPO_URL
cd REPO_NAME
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Install Ionic CLI

```bash
npm install -g @ionic/cli
```

### 4. Serve the App

```bash
ionic serve
```

This will launch the app in your default browser for development and testing.

---

## 🤖 Running the Project on Android

### 1. Set Up Android Studio

* Install [Android Studio](https://developer.android.com/studio)

### 2. Sync and Build

```bash
ionic cap sync android
ionic cap open android
```

### 3. Run the App

* Use Android Studio’s emulator or connect a physical device.
* Click **Run** from the Android Studio toolbar.

---

## 🍏 Running the Project on iOS

### 1. Set Up XCode

* Install [XCode](https://developer.apple.com/xcode/) and its CLI tools.

### 2. Sync and Open in XCode

```bash
ionic cap sync ios
ionic cap open ios
```

### 3. Run the App

* Use XCode’s emulator or a physical iOS device.
* Build and run from the XCode toolbar.

---

## 📦 Build APK or IPA (Optional)

* For Android: Use **Build > Build Bundle(s) / APK(s)** in Android Studio.
* For iOS: Use **Product > Archive** in XCode for TestFlight or manual installs.

---

## 🛠 Notes

* Ensure you have proper permissions set up for Android/iOS builds.
* Keep dependencies up-to-date using `npm outdated` and `npm update`.
* Test thoroughly across platforms after every major change.


