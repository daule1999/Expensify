import { db } from '../database';
import * as Crypto from 'expo-crypto';

export interface Investment {
  id: string;
  name: string;
  type: string; // Stock, MF, Crypto, Gold, Real Estate, etc.
  amount_invested: number;
  current_value: number;
  purchase_date: number;
  notes?: string;
  created_at: number;
  updated_at: number;
}

export const investmentService = {
  getAllInvestments: async (): Promise<Investment[]> => {
    try {
      return await db.getAllAsync<Investment>(
        'SELECT * FROM investments ORDER BY created_at DESC'
      );
    } catch (error) {
      console.error('Error fetching investments:', error);
      return [];
    }
  },

  addInvestment: async (data: Omit<Investment, 'id' | 'created_at' | 'updated_at'>): Promise<string> => {
    const id = Crypto.randomUUID();
    const now = Date.now();
    try {
      await db.runAsync(
        `INSERT INTO investments (
          id, name, type, amount_invested, current_value, 
          purchase_date, notes, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id, data.name, data.type, data.amount_invested, 
          data.current_value || data.amount_invested, // Default current value to initial investment
          data.purchase_date, data.notes || '', now, now
        ]
      );
      return id;
    } catch (error) {
      console.error('Failed to add investment:', error);
      throw error;
    }
  },

  updateInvestment: async (id: string, updates: Partial<Investment>): Promise<void> => {
    const now = Date.now();
    try {
      const fields = Object.keys(updates).filter(k => k !== 'id' && k !== 'created_at');
      if (fields.length === 0) return;

      const setClause = fields.map(k => `${k} = ?`).join(', ') + ', updated_at = ?';
      const values = fields.map(k => (updates as any)[k]);
      values.push(now);
      values.push(id);

      await db.runAsync(`UPDATE investments SET ${setClause} WHERE id = ?`, values);
    } catch (error) {
      console.error('Failed to update investment:', error);
      throw error;
    }
  },

  deleteInvestment: async (id: string): Promise<void> => {
    try {
      await db.runAsync('DELETE FROM investments WHERE id = ?', [id]);
    } catch (error) {
      console.error('Failed to delete investment:', error);
      throw error;
    }
  },

  getPortfolioSummary: (investments: Investment[]) => {
    const totalInvested = investments.reduce((sum, inv) => sum + inv.amount_invested, 0);
    const totalCurrent = investments.reduce((sum, inv) => sum + (inv.current_value || inv.amount_invested), 0);
    const profitLoss = totalCurrent - totalInvested;
    const percentage = totalInvested > 0 ? (profitLoss / totalInvested) * 100 : 0;

    return {
      totalInvested,
      totalCurrent,
      profitLoss,
      percentage
    };
  }
};
