import { db } from '../database';
import * as Crypto from 'expo-crypto';

export interface Budget {
  id: string;
  category: string;
  amount: number;
  period: 'monthly' | 'weekly' | 'yearly';
  start_date: number;
  is_active: number;
  created_at: number;
}

export interface BudgetWithSpending extends Budget {
  spent: number;
  remaining: number;
  percentage: number;
}

export const budgetService = {
  getAll: async (): Promise<Budget[]> => {
    try {
      return await db.getAllAsync<Budget>(
        `SELECT * FROM budgets WHERE is_active = 1 ORDER BY category ASC`
      );
    } catch (error) {
      console.error('Error fetching budgets:', error);
      return [];
    }
  },

  add: async (data: { category: string; amount: number; period: 'monthly' | 'weekly' | 'yearly' }): Promise<string> => {
    if (!data.amount || data.amount <= 0) {
      throw new Error('Budget amount must be greater than zero');
    }
    if (!data.category || data.category.trim().length === 0) {
      throw new Error('Category is required');
    }

    const id = Crypto.randomUUID();
    const now = Date.now();

    // Deactivate existing budget for the same category
    await db.runAsync(
      `UPDATE budgets SET is_active = 0 WHERE category = ? AND is_active = 1`,
      [data.category]
    );

    await db.runAsync(
      `INSERT INTO budgets (id, category, amount, period, start_date, is_active, created_at) VALUES (?, ?, ?, ?, ?, 1, ?)`,
      [id, data.category.trim(), data.amount, data.period, now, now]
    );

    return id;
  },

  update: async (id: string, updates: Partial<Pick<Budget, 'amount' | 'period'>>): Promise<void> => {
    const fields = Object.keys(updates).filter(k => k === 'amount' || k === 'period');
    if (fields.length === 0) return;

    const setClause = fields.map(k => `${k} = ?`).join(', ');
    const values = fields.map(k => (updates as any)[k]);
    values.push(id);

    await db.runAsync(`UPDATE budgets SET ${setClause} WHERE id = ?`, values);
  },

  delete: async (id: string): Promise<void> => {
    await db.runAsync(`UPDATE budgets SET is_active = 0 WHERE id = ?`, [id]);
  },

  /**
   * Get all active budgets with their current spending for the period
   */
  getBudgetsWithSpending: async (): Promise<BudgetWithSpending[]> => {
    try {
      const budgets = await budgetService.getAll();
      const result: BudgetWithSpending[] = [];

      for (const budget of budgets) {
        const { startMs, endMs } = budgetService.getPeriodRange(budget.period);

        const spentResult = await db.getAllAsync<{ total: number }>(
          `SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE category = ? AND date >= ? AND date <= ?`,
          [budget.category, startMs, endMs]
        );

        const spent = spentResult[0]?.total || 0;
        const remaining = Math.max(0, budget.amount - spent);
        const percentage = budget.amount > 0 ? Math.min(100, (spent / budget.amount) * 100) : 0;

        result.push({
          ...budget,
          spent,
          remaining,
          percentage,
        });
      }

      return result;
    } catch (error) {
      console.error('Error fetching budgets with spending:', error);
      return [];
    }
  },

  /**
   * Get period start/end timestamps for the current period
   */
  getPeriodRange: (period: string): { startMs: number; endMs: number } => {
    const now = new Date();
    let start: Date;
    let end: Date;

    switch (period) {
      case 'weekly': {
        const dayOfWeek = now.getDay();
        start = new Date(now);
        start.setDate(now.getDate() - dayOfWeek);
        start.setHours(0, 0, 0, 0);
        end = new Date(start);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        break;
      }
      case 'yearly': {
        start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
        end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
        break;
      }
      case 'monthly':
      default: {
        start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        break;
      }
    }

    return { startMs: start.getTime(), endMs: end.getTime() };
  },

  /**
   * Get categories that have existing budgets
   */
  getBudgetedCategories: async (): Promise<string[]> => {
    const budgets = await budgetService.getAll();
    return budgets.map(b => b.category);
  },

  /**
   * Check budgets against configured alert thresholds.
   * Returns budgets that exceed the warning or critical threshold.
   */
  checkBudgetAlerts: async (warningPct: number = 75, criticalPct: number = 90): Promise<{
    warnings: BudgetWithSpending[];
    criticals: BudgetWithSpending[];
  }> => {
    const budgets = await budgetService.getBudgetsWithSpending();
    const warnings = budgets.filter(b => b.percentage >= warningPct && b.percentage < criticalPct);
    const criticals = budgets.filter(b => b.percentage >= criticalPct);
    return { warnings, criticals };
  },
};
