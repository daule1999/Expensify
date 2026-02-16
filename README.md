# Expensify - React Native App

A comprehensive offline-first expense tracking application with encryption, analytics, and automated transaction reading.

## 🚀 Features

### ✅ Implemented (Chunk 1 & 2)

- **Offline-First Architecture**: All data stored locally using WatermelonDB
- **End-to-End Encryption**: AES-256-GCM encryption with PBKDF2 key derivation
- **Secure Data Storage**: Master password protection with verification
- **Encrypted Backups**: Automatic daily backups with encryption
- **Database Models**: Complete schema for expenses, income, investments, debts, EMIs, subscriptions, and accounts
- **Manual Entry**: dedicated screens for adding expenses and income with category/account selection
- **Automated SMS Sync**: Auto-detects transaction SMS (Android) and creates expense/income entries
- **Charts & Analytics**: Visual reports using Pie and Line charts for expense breakdown and monthly trends
- **Investment & Debt**: Track portfolio value, loans, and recurring subscriptions

### 🔜 Coming Soon

- Advanced export options (CSV/PDF)
- Budget planning
- Bill reminders

## 📦 Tech Stack

- **Framework**: React Native with Expo
- **Language**: TypeScript
- **Database**: WatermelonDB (SQLite)
- **Encryption**: expo-crypto + react-native-aes-crypto
- **Navigation**: React Navigation
- **State Management**: Zustand
- **Charts**: react-native-chart-kit + Victory Native

## 🏗️ Project Structure

```
ExpenseTracker/
├── src/
│   ├── database/
│   │   ├── models/          # WatermelonDB models
│   │   ├── schema.ts        # Database schema
│   │   └── index.ts         # Database initialization
│   ├── services/
│   │   ├── encryption.service.ts  # Encryption/decryption
│   │   └── backup.service.ts      # Backup/restore
│   ├── screens/
│   │   └── auth/
│   │       ├── SetupEncryption.tsx  # Initial setup
│   │       └── UnlockScreen.tsx     # App unlock
│   ├── types/
│   │   └── index.ts         # TypeScript definitions
│   └── ...
├── App.tsx                  # Main app entry
├── package.json
└── README.md
```

## 🔐 Security Features

### Encryption
- **Algorithm**: AES-256-GCM (Galois/Counter Mode)
- **Key Derivation**: PBKDF2 with 10,000 iterations
- **Key Length**: 256 bits
- **Salt**: Random 16-byte salt per installation
- **IV**: Random 16-byte IV per encryption operation

### Password Requirements
- Minimum 8 characters
- Cannot be recovered if lost
- Verified using encrypted token
- Can be updated with current password verification

### Backup Security
- All backups are encrypted
- Stored locally in app directory
- Maximum 7 backups retained
- Each backup includes checksum for integrity

## 📱 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Expo CLI

### Installation

**Note**: Due to network connectivity issues during setup, you'll need to install dependencies manually:

```bash
cd "/Users/dauleshwar/Downloads/Workspace/React Native/ExpenseTracker"

# Install dependencies (when internet is available)
npm install

# Start the development server
npm start

# Run on Android
npm run android

# Run on iOS
npm run ios
```

### First Launch

1. App will prompt you to set up a master password
2. Choose a strong, memorable password (minimum 8 characters)
3. **Important**: This password cannot be recovered if lost!
4. After setup, you'll need to enter this password each time you open the app

## 🗄️ Database Schema

### Tables
- **expenses**: Track all expenses with categories, tags, and payment methods
- **income**: Record income from various sources
- **investments**: Monitor investment portfolio
- **accounts**: Manage multiple account balances
- **debts**: Track outstanding debts
- **emis**: Monitor EMI payments
- **subscriptions**: Manage recurring subscriptions
- **categories**: Organize expenses and income
- **backup_metadata**: Track backup history

## 🔄 Backup & Restore

### Automatic Backups
- Daily automatic backups
- Encrypted with your master password
- Stored in app's document directory
- Last 7 backups retained

### Manual Backup
- Export encrypted backup file
- Share via any method
- Import on another device

### Restore
- Import backup file
- Enter master password to decrypt
- Choose to merge or replace existing data

## 🚧 Development Status

### Chunk 1: ✅ Complete
- Project setup
- Database layer
- Encryption & security
- Authentication screens

### Chunk 2: 🔜 Next
- Expense entry forms
- Income tracking
- Basic UI navigation

### Chunk 3-7: 📋 Planned
- Analytics & reporting
- Investment/debt/EMI/subscription management
- Notification reading (Android)
- Charts and visualizations
- Final polish


## ❓ Troubleshooting

### 1. "App Blocked by Play Protect"
When installing the debug APK, Google Play Protect might block it because it recognizes the debug certificate and sensitive permissions (SMS).

**Solution:**
1. Click **"More details"** (or the arrow icon).
2. Click **"Install anyway"**.

### 2. "App Not Installed" Error
If installation fails immediately:
1. **Uninstall any previous version** of Expensify/ExpenseTracker from your device.
2. Android prevents installing a new version with a different signature over an existing one.
3. Ensure you have sufficient storage space (at least 100MB).

## 📝 License


Private project - All rights reserved

## ⚠️ Important Notes

1. **Password Recovery**: There is NO way to recover your master password. If you forget it, you will lose access to all your data.

2. **Backups**: Regular backups are created automatically, but you should also export backups manually to external storage for safety.

3. **Offline Only**: This app works completely offline. No data is sent to any server.

4. **Android Permissions**: SMS/notification reading requires special permissions and will only work on Android.

## 🤝 Contributing

This is a private project. Not open for contributions at this time.
# Expensify
