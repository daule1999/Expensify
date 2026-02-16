import { db } from '../database';
import * as Crypto from 'expo-crypto';
import { notificationService } from './notification.service';

export interface Debt {
  id: string;
  name: string;
  principal_amount: number;
  remaining_amount: number;
  interest_rate?: number;
  emi_amount?: number;
  start_date: number;
  due_date?: number;
  creditor?: string;
  notes?: string;
  emi_notification_id?: string | null;
  created_at: number;
  updated_at: number;
}

export interface EMI {
  id: string;
  debt_id: string;
  name: string; // e.g. "Payment 1" or "Feb EMI"
  amount: number;
  start_date: number; // Payment date
  end_date: number; // Ignored for single payment, but kept for schema consistency
  payment_day: number; // Day of month
  is_active: number; // 0 or 1
  created_at: number;
  updated_at: number;
}

export const debtService = {
  getAllDebts: async (): Promise<Debt[]> => {
    try {
      return await db.getAllAsync<Debt>(
        'SELECT * FROM debts ORDER BY remaining_amount DESC'
      );
    } catch (error) {
      console.error('Error fetching debts:', error);
      return [];
    }
  },

  getDebtById: async (id: string): Promise<Debt | null> => {
    try {
      return await db.getFirstAsync<Debt>('SELECT * FROM debts WHERE id = ?', [id]);
    } catch (error) {
      console.error('Error fetching debt:', error);
      return null;
    }
  },

  getAllEMIs: async (debtId: string): Promise<EMI[]> => {
    try {
      return await db.getAllAsync<EMI>(
        'SELECT * FROM emis WHERE debt_id = ? ORDER BY start_date DESC',
        [debtId]
      );
    } catch (error) {
      console.error('Error fetching EMIs:', error);
      return [];
    }
  },

  addDebt: async (data: Omit<Debt, 'id' | 'created_at' | 'updated_at'>): Promise<string> => {
    const id = Crypto.randomUUID();
    const now = Date.now();
    
    // Schedule Notification
    let notificationId = null;
    if (data.due_date) {
        notificationId = await notificationService.scheduleEmiNotification({ ...data, id } as Debt);
    }

    try {
      await db.runAsync(
        `INSERT INTO debts (
          id, name, principal_amount, remaining_amount, interest_rate, emi_amount,
          start_date, due_date, creditor, notes, emi_notification_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id, data.name, data.principal_amount, data.remaining_amount, 
          data.interest_rate || 0, data.emi_amount || 0, data.start_date, data.due_date || null, 
          data.creditor || '', data.notes || '', notificationId, now, now
        ]
      );
      return id;
    } catch (error) {
      console.error('Failed to add debt:', error);
      throw error;
    }
  },

  updateDebt: async (id: string, updates: Partial<Debt>): Promise<void> => {
    const now = Date.now();
    try {
      // Fetch existing for notification logic
      const existing = await db.getFirstAsync<Debt>('SELECT * FROM debts WHERE id = ?', [id]);
      
      if (existing) {
          if (updates.due_date || updates.name || updates.emi_amount || updates.remaining_amount) {
              // Cancel old
              if (existing.emi_notification_id) {
                  await notificationService.cancelNotification(existing.emi_notification_id);
              }

              // Schedule new
              const merged = { ...existing, ...updates };
              if (merged.due_date) {
                  updates.emi_notification_id = await notificationService.scheduleEmiNotification(merged);
              }
          }
      }

      const fields = Object.keys(updates).filter(k => k !== 'id' && k !== 'created_at');
      if (fields.length === 0) return;

      const setClause = fields.map(k => `${k} = ?`).join(', ') + ', updated_at = ?';
      const values = fields.map(k => (updates as any)[k]);
      values.push(now);
      values.push(id);

      await db.runAsync(`UPDATE debts SET ${setClause} WHERE id = ?`, values);
    } catch (error) {
      console.error('Failed to update debt:', error);
      throw error;
    }
  },

  deleteDebt: async (id: string): Promise<void> => {
    try {
      const existing = await db.getFirstAsync<Debt>('SELECT * FROM debts WHERE id = ?', [id]);
      if (existing && existing.emi_notification_id) {
          await notificationService.cancelNotification(existing.emi_notification_id);
      }
      await db.runAsync('DELETE FROM emis WHERE debt_id = ?', [id]);
      await db.runAsync('DELETE FROM debts WHERE id = ?', [id]);
    } catch (error) {
      console.error('Failed to delete debt:', error);
      throw error;
    }
  },

  addPayment: async (debtId: string, amount: number, date: number): Promise<void> => {
    const id = Crypto.randomUUID();
    const now = Date.now();
    try {
      await db.withTransactionAsync(async () => {
        // 1. Add EMI record
        await db.runAsync(
          `INSERT INTO emis (
            id, debt_id, name, amount, start_date, end_date, payment_day, 
            is_active, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id, debtId, 'Payment', amount, date, date, new Date(date).getDate(), 
            0, now, now // is_active=0 mainly because this is a one-off payment record here
          ]
        );

        // 2. Fetch current debt to calculate new remaining
        const debt = await db.getFirstAsync<Debt>('SELECT * FROM debts WHERE id = ?', [debtId]);
        if (debt) {
            const newRemaining = Math.max(0, debt.remaining_amount - amount);
            await db.runAsync(
                'UPDATE debts SET remaining_amount = ?, updated_at = ? WHERE id = ?',
                [newRemaining, now, debtId]
            );
        }
      });
    } catch (error) {
        console.error('Failed to add payment:', error);
        throw error;
    }
  }
};
