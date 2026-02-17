# Expensify - Premium Expense Tracker

Expensify is a privacy-first, feature-rich personal finance manager built with React Native and Expo. It features automatic SMS parsing, secure local encryption, and comprehensive financial planning tools.

## 📲 Download APK

[![Download Latest APK](https://img.shields.io/badge/Download-APK-brightgreen?style=for-the-badge&logo=android)](https://github.com/daule1999/Expensify/releases/tag/latest-preview)

<!-- BUILD_LINKS_START -->
| Link | Description |
|------|-------------|
| [**Latest Release (APK)**](https://github.com/daule1999/Expensify/releases/tag/latest-preview) | Download the latest preview build |
| [**Latest Build Artifact**](https://github.com/daule1999/Expensify/actions/runs/22103616120/artifacts/5541074384) | Direct artifact download (Build 2026-02-17 15:23) |
| [**All CI Builds**](https://github.com/daule1999/Expensify/actions/workflows/android-release.yml) | All build runs |
<!-- BUILD_LINKS_END -->

## 🌟 Key Features
- **Auto-SMS Parsing**: Automatically extract transactions from bank SMS alerts using on-device pattern matching.
- **Privacy First**: All data is stored locally. Encryption uses PBKDF2 key derivation and XOR stream cipher.
- **Budget Planning**: Set monthly limits per category and get real-time spending alerts.
- **Bill Reminders**: Never miss a subscription renewal or EMI payment with scheduled push notifications.
- **Recurring Transactions**: Automate your fixed monthly expenses and income.
- **Rich Analytics**: Visual breakdowns of your net worth, income vs. expenses, and category-wise spending.
- **Secure Backup**: Encrypted backup and restore via local files or Google Drive.

## 🚀 Getting Started

### Prerequisites
- Node.js (v16+)
- Expo Go app on your mobile device
- (Optional) Android Studio / Xcode for emulators

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/daule1999/Expensify.git
   cd Expensify
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npx expo start
   ```
4. Scan the QR code with Expo Go.

## 🛠 Tech Stack
- **Framework**: React Native (Expo)
- **Database**: SQLite (expo-sqlite)
- **Security**: AES-256 (PBKDF2), Biometrics (expo-local-authentication)
- **UI**: Vanilla CSS, Linear Gradient, Ionicons
- **Navigation**: React Navigation

## 🔐 Security & Privacy
- Data never leaves your device unless you manually export or backup.
- Sensitive values are encrypted before storage.
- Biometric lock supported for app entry.

## 📄 License
MIT License. See [LICENSE](LICENSE) for details.
