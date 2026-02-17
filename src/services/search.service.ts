import { db } from '../database';
import { settingsService } from './settings.service';

export interface SearchFilters {
  query?: string;
  dateFrom?: number;
  dateTo?: number;
  amountMin?: number;
  amountMax?: number;
  category?: string;
  type?: 'expense' | 'income';
  account?: string;
}

export interface SearchResult {
  id: string;
  amount: number;
  category?: string;
  source?: string;
  description?: string;
  date: number;
  type: 'expense' | 'income';
  account?: string;
}

export const searchTransactions = async (filters: SearchFilters): Promise<SearchResult[]> => {
  const results: SearchResult[] = [];

  // Build expense query
  if (!filters.type || filters.type === 'expense') {
    let expenseQuery = 'SELECT id, amount, category, description, date, account FROM expenses WHERE 1=1';
    const expenseParams: any[] = [];

    if (filters.query) {
      expenseQuery += ' AND (LOWER(description) LIKE ? OR LOWER(category) LIKE ?)';
      const q = `%${filters.query.toLowerCase()}%`;
      expenseParams.push(q, q);
    }
    if (filters.dateFrom) {
      expenseQuery += ' AND date >= ?';
      expenseParams.push(filters.dateFrom);
    }
    if (filters.dateTo) {
      expenseQuery += ' AND date <= ?';
      expenseParams.push(filters.dateTo);
    }
    if (filters.amountMin !== undefined) {
      expenseQuery += ' AND amount >= ?';
      expenseParams.push(filters.amountMin);
    }
    if (filters.amountMax !== undefined) {
      expenseQuery += ' AND amount <= ?';
      expenseParams.push(filters.amountMax);
    }
    if (filters.category) {
      expenseQuery += ' AND category = ?';
      expenseParams.push(filters.category);
    }
    if (filters.account) {
      expenseQuery += ' AND account = ?';
      expenseParams.push(filters.account);
    }

    expenseQuery += ' ORDER BY date DESC LIMIT 100';

    try {
      const rows = await db.getAllAsync<any>(expenseQuery, expenseParams);
      rows.forEach(r => results.push({ ...r, type: 'expense' }));
    } catch (e) {
      console.error('Error searching expenses:', e);
    }
  }

  // Build income query
  if (!filters.type || filters.type === 'income') {
    let incomeQuery = 'SELECT id, amount, source, description, date FROM income WHERE 1=1';
    const incomeParams: any[] = [];

    if (filters.query) {
      incomeQuery += ' AND (LOWER(description) LIKE ? OR LOWER(source) LIKE ?)';
      const q = `%${filters.query.toLowerCase()}%`;
      incomeParams.push(q, q);
    }
    if (filters.dateFrom) {
      incomeQuery += ' AND date >= ?';
      incomeParams.push(filters.dateFrom);
    }
    if (filters.dateTo) {
      incomeQuery += ' AND date <= ?';
      incomeParams.push(filters.dateTo);
    }
    if (filters.amountMin !== undefined) {
      incomeQuery += ' AND amount >= ?';
      incomeParams.push(filters.amountMin);
    }
    if (filters.amountMax !== undefined) {
      incomeQuery += ' AND amount <= ?';
      incomeParams.push(filters.amountMax);
    }

    incomeQuery += ' ORDER BY date DESC LIMIT 100';

    try {
      const rows = await db.getAllAsync<any>(incomeQuery, incomeParams);
      rows.forEach(r => results.push({ ...r, type: 'income' }));
    } catch (e) {
      console.error('Error searching income:', e);
    }
  }

  // Sort combined results by date descending
  results.sort((a, b) => b.date - a.date);
  return results.slice(0, 100);
};
