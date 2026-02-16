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
  checkPermission: async (): Promise<boolean> => {
    // 0. Force Mock Data if SmsAndroid is not available or we are in Expo Go
    // If native module is undefined, use mock.
    if (!SmsAndroid || !SmsAndroid.list) {
        console.log('[SMS] Native module not found, skipping permission check (Mock Mode).');
        return true; // Pretend permission is granted for mock mode
    }

    if (Platform.OS !== 'android') return false;

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
    // 1. Mock Data for Expo Go or Non-Android
    if (!SmsAndroid || !SmsAndroid.list) {
        console.log('[SMS] Using Mock SMS Data (Expo Go / Simulator)');
        
        // Simulating delay to show loading state
        await new Promise(resolve => setTimeout(resolve, 1500)); 

        return [
            {
                _id: '1',
                address: 'HDFCBK',
                body: 'Rs. 1500.00 debited from a/c 1234 on 12-02-26 to ZOMATO. UPI Ref: 12345678.',
                date: Date.now() - 100000,
            },
            {
                _id: '2',
                address: 'SBIUPI',
                body: 'Dear User, INR 450.00 debited from A/c X6789 via UPI for UBER RIDES.',
                date: Date.now() - 500000,
            },
            {
                _id: '3',
                address: 'AMZPAY',
                body: 'Paid Rs. 2000.00 for electricity bill via Amazon Pay. Txn ID: 998877.',
                date: Date.now() - 86400000,
            },
            {
                 _id: '4',
                 address: 'MOM',
                 body: 'Hello beta, sent you some money.',
                 date: Date.now() - 1000,
            },
            {
                _id: '5',
                address: 'HDFC-SALARY',
                body: 'Rs. 50000.00 credited to a/c 1234 on 30-01-26. Salary for Jan.',
                date: Date.now() - 2000000,
            }
        ];
    }

    console.log('[SMS] Reading real SMS from inbox...');
    // 2. Real Native SMS Reading
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
                      parsed.account !== 'Unknown' ? `Bank (${parsed.account})` : 'Cash'
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
                      parsed.account !== 'Unknown' ? `Bank (${parsed.account})` : 'Cash'
                  ]
              );
              addedCount++;
          }
      }

      return { total, processed: processedCount, added: addedCount };
  }
};
