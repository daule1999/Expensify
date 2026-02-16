import { db } from '../database';
import { auditService } from './audit.service';
import * as Crypto from 'expo-crypto';

export interface TransactionSummary {
  totalBalance: number;
  totalIncome: number;
  totalExpenses: number;
}

export interface Transaction {
  id: string;
  amount: number;
  category?: string; // For expenses
  source?: string;   // For income
  description?: string;
  date: number;
  type: 'expense' | 'income';
  created_at: number;
  updated_at: number;
  customData?: { [key: string]: string }; // Custom field values
  account?: string; // Bank account or 'Cash'
}

export const transactionService = {
  getSummary: async (account?: string): Promise<TransactionSummary> => {
    try {
      const params: any[] = [];
      const whereClause = account ? 'WHERE account = ?' : '';
      if (account) params.push(account);
      
      const incomeResult = await db.getAllAsync<{ total: number }>(`SELECT SUM(amount) as total FROM income ${whereClause}`, params);
      const totalIncome = incomeResult[0]?.total || 0;

      const expenseResult = await db.getAllAsync<{ total: number }>(`SELECT SUM(amount) as total FROM expenses ${whereClause}`, params);
      const totalExpenses = expenseResult[0]?.total || 0;

      return {
        totalBalance: totalIncome - totalExpenses,
        totalIncome,
        totalExpenses
      };
    } catch (error) {
      console.error('Error fetching transaction summary:', error);
      return { totalBalance: 0, totalIncome: 0, totalExpenses: 0 };
    }
  },

  getRecentTransactions: async (limit: number = 50): Promise<Transaction[]> => {
    try {
      const expenses = await db.getAllAsync<any>(
        `SELECT id, amount, category, description, date, created_at, updated_at, 'expense' as type FROM expenses`
      );
      const income = await db.getAllAsync<any>(
        `SELECT id, amount, source as category, description, date, created_at, updated_at, 'income' as type FROM income`
      );

      const all = [...expenses, ...income].sort((a, b) => b.date - a.date);
      return all.slice(0, limit);
    } catch (error) {
      console.error('Error fetching recent transactions:', error);
      return [];
    }
  },

  addTransaction: async (data: Omit<Transaction, 'id' | 'created_at' | 'updated_at'>): Promise<string> => {
    // Input validation
    if (!data.amount || data.amount <= 0) {
      throw new Error('Amount must be greater than zero');
    }
    if (data.amount >= 100000000) {
      throw new Error('Amount exceeds maximum allowed value (₹10Cr)');
    }
    if (!data.type || (data.type !== 'expense' && data.type !== 'income')) {
      throw new Error('Invalid transaction type');
    }

    const id = Crypto.randomUUID();
    const now = Date.now();
    const table = data.type === 'expense' ? 'expenses' : 'income';

    try {
      if (data.type === 'expense') {
        await db.runAsync(
          `INSERT INTO expenses (id, amount, category, description, date, account, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [id, data.amount, data.category || 'Uncategorized', data.description || '', data.date, data.account || 'Cash', now, now]
        );
      } else {
        await db.runAsync(
          `INSERT INTO income (id, amount, source, description, date, account, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [id, data.amount, data.source || 'Unknown', data.description || '', data.date, data.account || 'Cash', now, now]
        );
      }

      // Audit Log
      await auditService.logAction(
        'CREATE',
        data.type,
        id,
        null,
        { ...data, id, created_at: now, updated_at: now }
      );

      return id;
    } catch (error) {
      console.error('Failed to add transaction:', error);
      throw error;
    }
  },

  updateTransaction: async (id: string, type: 'expense' | 'income', updates: Partial<Transaction>): Promise<void> => {
    const table = type === 'expense' ? 'expenses' : 'income';
    const now = Date.now();

    try {
      // Fetch old value for audit
      const oldRecord = await db.getFirstAsync(`SELECT * FROM ${table} WHERE id = ?`, [id]);
      
      if (!oldRecord) throw new Error('Transaction not found');

      const fields = Object.keys(updates).filter(k => k !== 'id' && k !== 'created_at' && k !== 'type');
      if (fields.length === 0) return;

      const setClause = fields.map(k => `${k} = ?`).join(', ') + ', updated_at = ?';
      const values = fields.map(k => (updates as any)[k]);
      values.push(now);
      values.push(id);

      await db.runAsync(`UPDATE ${table} SET ${setClause} WHERE id = ?`, values);

      // Audit Log
      await auditService.logAction(
        'UPDATE',
        type,
        id,
        oldRecord,
        { ...oldRecord, ...updates, updated_at: now }
      );

    } catch (error) {
      console.error('Failed to update transaction:', error);
      throw error;
    }
  },

  getAll: async (account?: string): Promise<Transaction[]> => {
    try {
      const params: any[] = [];
      const whereClause = account ? 'WHERE account = ?' : '';
      if (account) params.push(account);
      
      const expenses = await db.getAllAsync<any>(
        `SELECT id, amount, category, description, date, account, created_at, updated_at, 'expense' as type FROM expenses ${whereClause}`,
        params
      );
      const income = await db.getAllAsync<any>(
        `SELECT id, amount, source as category, description, date, account, created_at, updated_at, 'income' as type FROM income ${whereClause}`,
        params
      );

      const allTransactions = [...expenses, ...income].sort((a, b) => b.date - a.date);
      return allTransactions;
    } catch (error) {
      console.error('Error fetching all transactions:', error);
      return [];
    }
  },

  deleteTransaction: async (id: string, type: 'expense' | 'income'): Promise<void> => {
    const table = type === 'expense' ? 'expenses' : 'income';

    try {
      // Fetch old value for audit
      const oldRecord = await db.getFirstAsync(`SELECT * FROM ${table} WHERE id = ?`, [id]);
      
      if (!oldRecord) throw new Error('Transaction not found');

      await db.runAsync(`DELETE FROM ${table} WHERE id = ?`, [id]);

      // Audit Log
      await auditService.logAction(
        'DELETE',
        type,
        id,
        oldRecord,
        null
      );

    } catch (error) {
      console.error('Failed to delete transaction:', error);
      throw error;
    }
  },

  importTransactions: async (transactions: Transaction[]): Promise<number> => {
    let count = 0;
    const now = Date.now();

    try {
      await db.withTransactionAsync(async () => {
        for (const t of transactions) {
          // Check if exists to avoid duplicates (optional, based on ID if preserved)
          // For now, we'll generate new IDs to avoid conflicts, or use existing if provided and unique
          // Strategy: Treat as new entries but try to preserve dates

          const id = t.id || Crypto.randomUUID();
          const type = t.type;
          
          if (type === 'expense') {
            await db.runAsync(
              `INSERT INTO expenses (id, amount, category, description, date, account, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
              [id, t.amount, t.category || 'Uncategorized', t.description || '', t.date, t.account || 'Cash', t.created_at || now, now]
            );
          } else {
            await db.runAsync(
              `INSERT INTO income (id, amount, source, description, date, account, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
              [id, t.amount, t.source || 'Unknown', t.description || '', t.date, t.account || 'Cash', t.created_at || now, now]
            );
          }
          count++;
        }
      });
      return count;
    } catch (error) {
      console.error('Failed to import transactions:', error);
      throw error;
    }
  }
};
