import { db } from '../database';
import { transactionService } from './transaction.service';
import * as Crypto from 'expo-crypto';

export interface RecurringTransaction {
  id: string;
  amount: number;
  type: 'expense' | 'income';
  category?: string;
  source?: string;
  description?: string;
  account?: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  next_date: number;
  is_active: number;
  created_at: number;
}

export const recurringService = {
  getAll: async (): Promise<RecurringTransaction[]> => {
    try {
      return await db.getAllAsync<RecurringTransaction>(
        `SELECT * FROM recurring_transactions WHERE is_active = 1 ORDER BY next_date ASC`
      );
    } catch (error) {
      console.error('Error fetching recurring transactions:', error);
      return [];
    }
  },

  add: async (data: Omit<RecurringTransaction, 'id' | 'is_active' | 'created_at'>): Promise<string> => {
    if (!data.amount || data.amount <= 0) throw new Error('Amount must be greater than zero');
    if (!data.frequency) throw new Error('Frequency is required');

    const id = Crypto.randomUUID();
    const now = Date.now();

    await db.runAsync(
      `INSERT INTO recurring_transactions (id, amount, type, category, source, description, account, frequency, next_date, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
      [
        id, data.amount, data.type,
        data.category || null, data.source || null,
        data.description || '', data.account || 'Cash',
        data.frequency, data.next_date, now
      ]
    );

    return id;
  },

  delete: async (id: string): Promise<void> => {
    await db.runAsync(`UPDATE recurring_transactions SET is_active = 0 WHERE id = ?`, [id]);
  },

  /**
   * Process all due recurring transactions: create actual transactions for items
   * whose next_date is in the past, then advance next_date to the next period.
   * Call this on app startup and periodically.
   */
  processDue: async (): Promise<number> => {
    const now = Date.now();
    let created = 0;

    try {
      const due = await db.getAllAsync<RecurringTransaction>(
        `SELECT * FROM recurring_transactions WHERE is_active = 1 AND next_date <= ?`,
        [now]
      );

      for (const item of due) {
        // Create the actual transaction
        await transactionService.addTransaction({
          amount: item.amount,
          type: item.type,
          category: item.category,
          source: item.source,
          description: `[Auto] ${item.description || item.category || item.source || 'Recurring'}`,
          account: item.account,
          date: item.next_date,
        });

        // Advance next_date
        const nextDate = recurringService.getNextDate(item.next_date, item.frequency);
        await db.runAsync(
          `UPDATE recurring_transactions SET next_date = ? WHERE id = ?`,
          [nextDate, item.id]
        );

        created++;
      }

      return created;
    } catch (error) {
      console.error('Error processing recurring transactions:', error);
      return created;
    }
  },

  getNextDate: (fromMs: number, frequency: string): number => {
    const d = new Date(fromMs);
    switch (frequency) {
      case 'daily':
        d.setDate(d.getDate() + 1);
        break;
      case 'weekly':
        d.setDate(d.getDate() + 7);
        break;
      case 'monthly':
        d.setMonth(d.getMonth() + 1);
        break;
      case 'yearly':
        d.setFullYear(d.getFullYear() + 1);
        break;
    }
    return d.getTime();
  },
};
