# Expensify - Maintenance Guide

This document provides technical details for maintaining and extending the Expensify application.

## 🏗 Project Structure
- **/src/services**: Core business logic and database interactions.
- **/src/screens**: UI components and screen-specific logic.
- **/src/database**: SQLite schema definitions and migrations.
- **/src/utils**: Reusable utility functions (SMS parsing, formatting).
- **/src/contexts**: React Contexts for Theme, Privacy, and Auth.

## 🗄 Database Management
The app uses `expo-sqlite`. 
- To add a new table, update `src/database/index.ts`.
- **Migrations**: When modifying existing tables, add an `ALTER TABLE` statement in the `initializeDatabase` function wrapped in a `try-catch` to handle cases where the migration has already run.

## 🔐 Security Protocols
- **Encryption**: XOR stream cipher with SHA-256 derived keys (10,000 iterations). 
- **Vault State**: The `derivedKey` is kept only in memory and cleared on `lock()`.
- **Bio-authentication**: Managed via `expo-local-authentication`.

## 📩 SMS Parser Support
To add support for a new bank:
1. Identify common keywords in their SMS (e.g., "DEBITED", "TRANSACTION AT").
2. Check if the keyword is already in `src/utils/sms-parser.ts` patterns.
3. If not, add a new regex to the `PATTERNS` object.
4. Add the bank's short-code identifier (e.g., "KOTAK") to `builtInIdentifiers` if applicable.

## 🧪 Testing & Quality
- **In-App Health Check**: Use the `testService` (`src/services/test.service.ts`) to run automated sanity checks.
- **Audit Logs**: All sensitive operations (Create/Update/Delete) are logged in the `audit_logs` table via `audit.service.ts`.

## 🚀 Deployment
Ensure the `scheme` in `app.json` is set for deep linking:
```json
{
  "expo": {
    "scheme": "expensetracker"
  }
}
```
Run `npx expo prebuild` before creating production builds to ensure all native configurations are synced.
