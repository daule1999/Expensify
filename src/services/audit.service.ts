import { db } from '../database';
import * as Crypto from 'expo-crypto';
import * as Device from 'expo-device';

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE';
export type EntityType = 'expense' | 'income' | 'investment' | 'debt' | 'category' | 'settings';

export interface AuditLogEntry {
  id: string;
  action: AuditAction;
  entity_type: EntityType;
  entity_id: string;
  old_value?: any; // JSON object
  new_value?: any; // JSON object
  user_id?: string;
  timestamp: number;
  metadata?: any; // JSON object
}

export const auditService = {
  /**
   * Log an action to the audit_logs table
   */
  logAction: async (
    action: AuditAction,
    entityType: EntityType,
    entityId: string,
    oldValue?: any,
    newValue?: any,
    userId?: string
  ): Promise<void> => {
    try {
      const id = Crypto.randomUUID();
      const timestamp = Date.now();
      
      const metadata = {
        deviceName: Device.deviceName,
        osName: Device.osName,
        osVersion: Device.osVersion,
      };

      await db.runAsync(
        `INSERT INTO audit_logs (
          id, action, entity_type, entity_id, old_value, new_value, user_id, timestamp, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          action,
          entityType,
          entityId,
          oldValue ? JSON.stringify(oldValue) : null,
          newValue ? JSON.stringify(newValue) : null,
          userId || 'system', // Default to 'system' or active user
          timestamp,
          JSON.stringify(metadata)
        ]
      );

      console.log(`[Audit] ${action} on ${entityType} (${entityId}) logged.`);
    } catch (error) {
      console.error('[Audit] Failed to log action:', error);
      // We don't throw here to avoid blocking the main user action if logging fails
    }
  },

  /**
   * Retrieve audit history for a specific entity
   */
  getHistoryForEntity: async (entityId: string): Promise<AuditLogEntry[]> => {
    try {
      const result: any[] = await db.getAllAsync(
        `SELECT * FROM audit_logs WHERE entity_id = ? ORDER BY timestamp DESC`,
        [entityId]
      );
      
      return result.map(row => ({
        ...row,
        old_value: row.old_value ? JSON.parse(row.old_value) : null,
        new_value: row.new_value ? JSON.parse(row.new_value) : null,
        metadata: row.metadata ? JSON.parse(row.metadata) : null,
      }));
    } catch (error) {
      console.error('[Audit] Failed to fetch history:', error);
      return [];
    }
  },

  /**
   * Retrieve n most recent audit logs
   */
  getRecentLogs: async (limit: number = 50): Promise<AuditLogEntry[]> => {
    try {
      const result: any[] = await db.getAllAsync(
        `SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT ?`,
        [limit]
      );

      return result.map(row => ({
        ...row,
        old_value: row.old_value ? JSON.parse(row.old_value) : null,
        new_value: row.new_value ? JSON.parse(row.new_value) : null,
        metadata: row.metadata ? JSON.parse(row.metadata) : null,
      }));
    } catch (error) {
      console.error('[Audit] Failed to fetch recent logs:', error);
      return [];
    }
  },
  
  /**
   * Delete logs older than specific timestamp (for cleanup)
   */
  pruneLogs: async (olderThanTimestamp: number): Promise<void> => {
      try {
          await db.runAsync(
              `DELETE FROM audit_logs WHERE timestamp < ?`,
              [olderThanTimestamp]
          );
      } catch (error) {
          console.error('[Audit] Failed to prune logs:', error);
      }
  }
};
