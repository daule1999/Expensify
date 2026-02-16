import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { Transaction } from './transaction.service';

export const importService = {
  pickDocument: async (): Promise<DocumentPicker.DocumentPickerResult> => {
    return await DocumentPicker.getDocumentAsync({
      type: ['application/json', 'text/csv', 'text/comma-separated-values'],
      copyToCacheDirectory: true
    });
  },

  readJSONFile: async (uri: string): Promise<Transaction[]> => {
    try {
      const content = await FileSystem.readAsStringAsync(uri);
      const data = JSON.parse(content);

      if (!Array.isArray(data)) {
        throw new Error('Invalid format: Root element must be an array');
      }

      return importService.validateTransactions(data);
    } catch (error) {
      console.error('Error reading JSON file:', error);
      throw error;
    }
  },

  readCSVFile: async (uri: string): Promise<Transaction[]> => {
    try {
      const content = await FileSystem.readAsStringAsync(uri);
      const lines = content.trim().split('\n');

      if (lines.length < 2) {
        throw new Error('CSV must have a header row and at least one data row');
      }

      // Parse header to find column indices
      const headers = importService.parseCSVLine(lines[0]).map(h => h.toLowerCase().trim());
      const dateIdx = headers.findIndex(h => h === 'date');
      const typeIdx = headers.findIndex(h => h === 'type');
      const amountIdx = headers.findIndex(h => h === 'amount');
      const categoryIdx = headers.findIndex(h => h.includes('category') || h.includes('source'));
      const descIdx = headers.findIndex(h => h.includes('description'));
      const accountIdx = headers.findIndex(h => h.includes('account'));

      if (amountIdx === -1 || typeIdx === -1) {
        throw new Error('CSV must have "Amount" and "Type" columns');
      }

      const transactions: any[] = [];

      for (let i = 1; i < lines.length; i++) {
        const row = importService.parseCSVLine(lines[i]);
        if (row.length === 0) continue;

        const amount = parseFloat(row[amountIdx]?.replace(/,/g, '') || '0');
        const type = row[typeIdx]?.trim().toLowerCase();

        if (!amount || amount <= 0 || (type !== 'expense' && type !== 'income')) {
          continue; // Skip invalid rows
        }

        const dateStr = dateIdx >= 0 ? row[dateIdx] : '';
        const parsedDate = dateStr ? new Date(dateStr).getTime() : Date.now();

        transactions.push({
          amount,
          type,
          category: categoryIdx >= 0 ? row[categoryIdx]?.trim() : undefined,
          source: categoryIdx >= 0 && type === 'income' ? row[categoryIdx]?.trim() : undefined,
          description: descIdx >= 0 ? row[descIdx]?.trim() : '',
          account: accountIdx >= 0 ? row[accountIdx]?.trim() : 'Cash',
          date: isNaN(parsedDate) ? Date.now() : parsedDate,
        });
      }

      if (transactions.length === 0) {
        throw new Error('No valid transactions found in CSV');
      }

      return transactions as Transaction[];
    } catch (error) {
      console.error('Error reading CSV file:', error);
      throw error;
    }
  },

  /**
   * Parse a single CSV line, handling quoted fields with commas
   */
  parseCSVLine: (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (inQuotes) {
        if (char === '"' && line[i + 1] === '"') {
          current += '"';
          i++; // Skip escaped quote
        } else if (char === '"') {
          inQuotes = false;
        } else {
          current += char;
        }
      } else {
        if (char === '"') {
          inQuotes = true;
        } else if (char === ',') {
          result.push(current);
          current = '';
        } else {
          current += char;
        }
      }
    }

    result.push(current);
    return result;
  },

  /**
   * Validate and sanitize an array of transaction objects
   */
  validateTransactions: (data: any[]): Transaction[] => {
    const validated = data.filter(item => {
      const hasAmount = typeof item.amount === 'number' && item.amount > 0;
      const hasDate = item.date !== undefined;
      const hasType = item.type === 'expense' || item.type === 'income';
      return hasAmount && hasDate && hasType;
    });

    if (validated.length === 0) {
      throw new Error('No valid transactions found. Each must have amount (>0), date, and type.');
    }

    return validated as Transaction[];
  }
};
