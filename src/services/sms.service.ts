import { PermissionsAndroid, Platform } from 'react-native';
// @ts-ignore
import SmsAndroid from 'react-native-get-sms-android';
import * as Device from 'expo-device';
import * as Crypto from 'expo-crypto';
import { db } from '../database';
import { smsParser, ParsedTransaction } from '../utils/sms-parser';
import { settingsService } from './settings.service';

export interface SyncProgress {
  total: number;
  processed: number;
  added: number;
}

export const smsService = {
  isAvailable: (): boolean => {
    return !!(SmsAndroid && SmsAndroid.list && Platform.OS === 'android');
  },

  checkPermission: async (): Promise<boolean> => {
    // Check if SMS functionality is available
    if (!smsService.isAvailable()) {
        console.warn('[SMS] Native module not found or not on Android. SMS functionality requires a development build on Android.');
        return false;
    }

    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_SMS,
        {
          title: 'SMS Permission',
          message: 'Expensify needs access to your SMS to auto-detect expenses.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      console.warn('[SMS] Permission request error:', err);
      return false;
    }
  },

  getAllSms: async (): Promise<any[]> => {
    // Check if SMS functionality is available
    if (!smsService.isAvailable()) {
        console.warn('[SMS] SMS functionality not available in current environment. Use a development build on Android for SMS features.');
        return [];
    }

    console.log('[SMS] Reading real SMS from inbox...');
    return new Promise((resolve, reject) => {
        const filter = {
            box: 'inbox',
            maxCount: 1000, // Read last 1000 messages
        };

        SmsAndroid.list(
            JSON.stringify(filter),
            (fail: string) => {
                console.error('Failed to list SMS:', fail);
                resolve([]); // Fail gracefully
            },
            (count: number, smsList: string) => {
                try {
                    const arr = JSON.parse(smsList);
                    resolve(arr);
                } catch (e) {
                    console.error('Failed to parse SMS list', e);
                    resolve([]);
                }
            }
        );
    });
  },

  syncAllTransactions: async (onProgress?: (progress: SyncProgress) => void): Promise<SyncProgress> => {
      const hasPermission = await smsService.checkPermission();
      if (!hasPermission) {
          throw new Error('SMS Permission denied');
      }

      const allSms = await smsService.getAllSms();
      const accountSettings = await settingsService.getAccountSettings();
      const blockedSenders = accountSettings.blockedSenders.map((s: string) => s.toLowerCase());
      const blockedKeywords = accountSettings.blockedKeywords.map((k: string) => k.toLowerCase());

      let addedCount = 0;
      let processedCount = 0;
      const total = allSms.length;

      // Handle case where allSms is empty (e.g. read failure or empty inbox)
      if (total === 0 && onProgress) {
          onProgress({ total: 0, processed: 0, added: 0 });
          return { total: 0, processed: 0, added: 0 };
      }

      for (const sms of allSms) {
          processedCount++;
          
          // Update progress every 5 messages or if total is small
          if ((processedCount % 5 === 0 || processedCount === total) && onProgress) {
              onProgress({ total, processed: processedCount, added: addedCount });
          }

          // 0. Check Blocklist
          const sender = sms.address.toLowerCase();
          const body = sms.body.toLowerCase();

          if (blockedSenders.some((s: string) => sender.includes(s))) continue;
          if (blockedKeywords.some((k: string) => body.includes(k))) continue;

          // 1. Parse SMS
          // Ensure timestamp is valid. Some SMS plugins return 'date' as string string
          const timestamp = typeof sms.date === 'string' ? parseInt(sms.date, 10) : sms.date;
          if (isNaN(timestamp)) continue;

          const parsed = smsParser.parse(sms.address, sms.body, timestamp);
          
          if (!parsed) continue; // Skip non-transaction SMS

          // 1.5. Self-Transfer Detection
          // If SMS has transfer keywords (NEFT/IMPS/RTGS/self) AND both
          // source and destination accounts belong to the user, skip it.
          if (parsed.isSelfTransfer && parsed.destinationAccount) {
              const userAccounts = accountSettings.bankAccounts || [];
              const userLast4s = userAccounts.map((a: any) => a.last4);
              const sourceClean = parsed.account.replace(/[xX]/g, '');
              const destClean = parsed.destinationAccount.replace(/[xX]/g, '');
              const sourceIsOwn = userLast4s.some((l4: string) => sourceClean.endsWith(l4) || l4.endsWith(sourceClean));
              const destIsOwn = userLast4s.some((l4: string) => destClean.endsWith(l4) || l4.endsWith(destClean));
              if (sourceIsOwn && destIsOwn) {
                  console.log(`[SMS] Skipped self-transfer: ₹${parsed.amount} (${parsed.account} → ${parsed.destinationAccount})`);
                  continue; // Don't count as income or expense
              }
          }

          // 1.8. Auto-Create Account if Unknown but Bank Name Detectable
          let accountNameForDb = parsed.account !== 'Unknown' ? `Bank (${parsed.account})` : 'Cash';
          
          if (parsed.account !== 'Unknown') {
              const cleanLast4 = parsed.account.replace(/[xX]/g, '');
              // Check if account exists
              const existingAccount = (accountSettings.bankAccounts || []).find(
                  (a: any) => a.last4 === cleanLast4
              );

              if (existingAccount) {
                  accountNameForDb = existingAccount.name;
              } else {
                  // No existing account, check if we have a bank name from sender
                  const bankName = smsParser.extractBankName(sms.address, accountSettings.customBankMap);
                  if (bankName && cleanLast4.length >= 3) {
                      // Auto-Create new account
                      const newAccountName = `${bankName} - ${cleanLast4}`;
                      const newAccount = {
                          id: Crypto.randomUUID(),
                          name: newAccountName,
                          bankName: bankName,
                          last4: cleanLast4
                      };

                      // Add to settings
                      if (!accountSettings.bankAccounts) accountSettings.bankAccounts = [];
                      accountSettings.bankAccounts.push(newAccount);
                      accountSettings.accounts.push(newAccountName);
                      
                      // Save immediately so subsequent SMS in this loop use it
                      await settingsService.saveAccountSettings(accountSettings);
                      console.log(`[SMS] Auto-created new account: ${newAccountName}`);
                      
                      accountNameForDb = newAccountName;
                  }
              }
          }

          // 2. Generate Hash for De-duplication
          // Hash = MD5(merchant + amount + date_rounded_to_minute)
          const dateMinute = Math.floor(parsed.date / 60000); 
          const rawString = `${parsed.merchant}-${parsed.amount}-${dateMinute}`;
          const hash = await Crypto.digestStringAsync(
              Crypto.CryptoDigestAlgorithm.SHA256,
              rawString
          );

          // 3. Check if exists & Insert based on type
          const descriptionWithHash = `${parsed.originalSms.substring(0, 50)}... [HASH:${hash}]`;

          if (parsed.type === 'debit') {
              // Expense Logic
              const existing = await db.getAllAsync(
                  `SELECT id FROM expenses WHERE description LIKE ? AND amount = ?`,
                  [`%HASH:${hash}%`, parsed.amount]
              );

              if (existing.length > 0) continue; // Duplicate found

              // Determine category based on keywords
              let category = 'Uncategorized';
              const lowerBody = parsed.originalSms.toLowerCase();
              if (lowerBody.includes('zomato') || lowerBody.includes('swiggy') || lowerBody.includes('food')) category = 'Food';
              else if (lowerBody.includes('uber') || lowerBody.includes('ola') || lowerBody.includes('travel')) category = 'Transport';
              else if (lowerBody.includes('bill') || lowerBody.includes('recharge') || lowerBody.includes('electricity')) category = 'Bills';

              await db.runAsync(
                  `INSERT INTO expenses (id, amount, category, description, date, created_at, updated_at, account) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                  [
                      Crypto.randomUUID(),
                      parsed.amount,
                      category,
                      descriptionWithHash,
                      parsed.date,
                      Date.now(),
                      Date.now(),
                      accountNameForDb
                  ]
              );
              addedCount++;

          } else if (parsed.type === 'credit') {
              // Income Logic
              const existing = await db.getAllAsync(
                  `SELECT id FROM income WHERE description LIKE ? AND amount = ?`,
                  [`%HASH:${hash}%`, parsed.amount]
              );

              if (existing.length > 0) continue; // Duplicate found

              // Determine source
              let source = parsed.merchant; // For income, merchant is essentially the source
              if (source === 'Unknown Merchant') source = 'Other Income';
              if (parsed.originalSms.toLowerCase().includes('salary')) source = 'Salary';

              await db.runAsync(
                  `INSERT INTO income (id, amount, source, description, date, created_at, updated_at, account) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                  [
                      Crypto.randomUUID(),
                      parsed.amount,
                      source,
                      descriptionWithHash,
                      parsed.date,
                      Date.now(),
                      Date.now(),
                      accountNameForDb
                  ]
              );
              addedCount++;
          }
      }

      return { total, processed: processedCount, added: addedCount };
  }
};
