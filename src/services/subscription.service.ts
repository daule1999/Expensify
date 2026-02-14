import { db } from '../database';
import * as Crypto from 'expo-crypto';
import { notificationService } from './notification.service';

export interface Subscription {
  id: string;
  name: string;
  amount: number;
  billing_cycle: 'monthly' | 'yearly';
  start_date: number;
  end_date?: number;
  next_billing_date?: number;
  category?: string;
  is_active: number; // 0 or 1
  auto_renew: number; // 0 or 1
  notification_id?: string | null;
  created_at: number;
  updated_at: number;
}

export const subscriptionService = {
  getAll: async (): Promise<Subscription[]> => {
    try {
      return await db.getAllAsync<Subscription>(
        'SELECT * FROM subscriptions ORDER BY next_billing_date ASC'
      );
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
      return [];
    }
  },

  addSubscription: async (data: Omit<Subscription, 'id' | 'created_at' | 'updated_at'>): Promise<string> => {
    const id = Crypto.randomUUID();
    const now = Date.now();
    
    // Calculate next billing date if not provided
    let nextBilling = data.next_billing_date;
    if (!nextBilling) {
      const start = new Date(data.start_date);
      if (data.billing_cycle === 'monthly') {
        start.setMonth(start.getMonth() + 1);
      } else {
        start.setFullYear(start.getFullYear() + 1);
      }
      nextBilling = start.getTime();
    }

    // Schedule Notification
    let notificationId = null;
    if (data.is_active !== 0) { // Only if active
        const subForNotification = { ...data, id, next_billing_date: nextBilling } as Subscription;
        notificationId = await notificationService.scheduleRenewalNotification(subForNotification);
    }

    try {
      await db.runAsync(
        `INSERT INTO subscriptions (
          id, name, amount, billing_cycle, start_date, end_date, next_billing_date, 
          category, is_active, auto_renew, notification_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id, data.name, data.amount, data.billing_cycle, data.start_date, 
          data.end_date || null, nextBilling, data.category || 'Uncategorized', 
          data.is_active ?? 1, data.auto_renew ?? 1, notificationId, now, now
        ]
      );
      return id;
    } catch (error) {
      console.error('Failed to add subscription:', error);
      throw error;
    }
  },

  updateSubscription: async (id: string, updates: Partial<Subscription>): Promise<void> => {
    const now = Date.now();
    try {
      // Fetch existing to handle notification logic
      const existing = await db.getFirstAsync<Subscription>('SELECT * FROM subscriptions WHERE id = ?', [id]);
      
      if (existing) {
          // If updating dates or status, reschedule
          if (updates.next_billing_date || updates.is_active !== undefined || updates.name || updates.amount) {
              // Cancel old
              if (existing.notification_id) {
                  await notificationService.cancelNotification(existing.notification_id);
              }

              // Schedule new (if active)
              let newNotificationId = null;
              const isActive = updates.is_active !== undefined ? updates.is_active : existing.is_active;
              
              if (isActive) {
                  const merged = { ...existing, ...updates };
                  newNotificationId = await notificationService.scheduleRenewalNotification(merged);
              }
              
              updates.notification_id = newNotificationId;
          }
      }

      const fields = Object.keys(updates).filter(k => k !== 'id' && k !== 'created_at');
      if (fields.length === 0) return;

      const setClause = fields.map(k => `${k} = ?`).join(', ') + ', updated_at = ?';
      const values = fields.map(k => (updates as any)[k]);
      values.push(now);
      values.push(id);

      await db.runAsync(`UPDATE subscriptions SET ${setClause} WHERE id = ?`, values);
    } catch (error) {
      console.error('Failed to update subscription:', error);
      throw error;
    }
  },

  deleteSubscription: async (id: string): Promise<void> => {
    try {
      const existing = await db.getFirstAsync<Subscription>('SELECT * FROM subscriptions WHERE id = ?', [id]);
      if (existing && existing.notification_id) {
        await notificationService.cancelNotification(existing.notification_id);
      }
      await db.runAsync('DELETE FROM subscriptions WHERE id = ?', [id]);
    } catch (error) {
      console.error('Failed to delete subscription:', error);
      throw error;
    }
  },

  calculateMonthlyTotal: (subscriptions: Subscription[]): number => {
    return subscriptions.reduce((total, sub) => {
      if (!sub.is_active) return total;
      return total + (sub.billing_cycle === 'monthly' ? sub.amount : sub.amount / 12);
    }, 0);
  }
};
