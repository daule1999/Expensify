import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Transaction } from './transaction.service';

export const exportService = {
  exportToCSV: async (transactions: Transaction[]) => {
    try {
      if (transactions.length === 0) {
        throw new Error('No transactions to export');
      }

      // Create CSV Header
      const headers = ['Date', 'Type', 'Amount', 'Category/Source', 'Description', 'Account'];
      const csvRows = [headers.join(',')];

      // Helper to safely escape CSV fields
      const escapeCSV = (value: string | number): string => {
        const str = String(value);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      // Add Data Rows
      transactions.forEach(t => {
        const date = new Date(t.date).toLocaleDateString();
        const type = t.type;
        const amount = t.amount;
        const category = escapeCSV(t.category || t.source || '');
        const description = escapeCSV(t.description || '');
        const account = escapeCSV(t.account || 'Cash');

        csvRows.push([date, type, amount, category, description, account].join(','));
      });

      const csvString = csvRows.join('\n');
      const filename = `transactions_${new Date().toISOString().split('T')[0]}.csv`;
      const fileUri = `${FileSystem.documentDirectory}${filename}`;

      // Write to file
      await FileSystem.writeAsStringAsync(fileUri, csvString, {
        encoding: FileSystem.EncodingType.UTF8
      });

      // Share file
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
            mimeType: 'text/csv',
            dialogTitle: 'Export Transactions'
        });
      } else {
        throw new Error('Sharing is not available on this device');
      }
    } catch (error) {
        console.error('Export CSV failed:', error);
        throw error;
    }
  },

  exportToJSON: async (transactions: Transaction[]) => {
    try {
        if (transactions.length === 0) {
            throw new Error('No transactions to export');
        }

        const jsonString = JSON.stringify(transactions, null, 2);
        const filename = `transactions_${new Date().toISOString().split('T')[0]}.json`;
        const fileUri = `${FileSystem.documentDirectory}${filename}`;

        await FileSystem.writeAsStringAsync(fileUri, jsonString, {
            encoding: FileSystem.EncodingType.UTF8
        });

        if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(fileUri, {
                mimeType: 'application/json',
                dialogTitle: 'Export Transactions Payload'
            });
        } else {
            throw new Error('Sharing is not available on this device');
        }
    } catch (error) {
        console.error('Export JSON failed:', error);
        throw error;
    }
  }
};
