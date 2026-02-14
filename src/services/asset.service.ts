import { db } from '../database';
import * as Crypto from 'expo-crypto';

export interface Asset {
  id: string;
  name: string;
  type: string; // Real Estate, Vehicle, Gold, Electronics, Other
  value: number;
  purchase_date: number;
  notes?: string;
  created_at: number;
  updated_at: number;
}

export const assetService = {
  getAllAssets: async (): Promise<Asset[]> => {
    try {
      const result = await db.getAllAsync<Asset>(
        'SELECT * FROM assets ORDER BY created_at DESC'
      );
      return result;
    } catch (error) {
      console.error('Error fetching assets:', error);
      return [];
    }
  },

  addAsset: async (data: Omit<Asset, 'id' | 'created_at' | 'updated_at'>): Promise<string> => {
    const id = Crypto.randomUUID();
    const now = Date.now();
    try {
      await db.runAsync(
        `INSERT INTO assets (
          id, name, type, value, 
          purchase_date, notes, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id, data.name, data.type, data.value,
          data.purchase_date, data.notes || '', now, now
        ]
      );
      return id;
    } catch (error) {
      console.error('Failed to add asset:', error);
      throw error;
    }
  },

  updateAsset: async (id: string, updates: Partial<Asset>): Promise<void> => {
    const now = Date.now();
    try {
      // @ts-ignore
      const fields = Object.keys(updates).filter(k => k !== 'id' && k !== 'created_at');
      if (fields.length === 0) return;

      const setClause = fields.map(k => `${k} = ?`).join(', ') + ', updated_at = ?';
      // @ts-ignore
      const values = fields.map(k => updates[k]);
      values.push(now);
      values.push(id);

      // @ts-ignore
      await db.runAsync(`UPDATE assets SET ${setClause} WHERE id = ?`, values);
    } catch (error) {
      console.error('Failed to update asset:', error);
      throw error;
    }
  },

  deleteAsset: async (id: string): Promise<void> => {
    try {
      await db.runAsync('DELETE FROM assets WHERE id = ?', [id]);
    } catch (error) {
      console.error('Failed to delete asset:', error);
      throw error;
    }
  },

  getTotalValue: (assets: Asset[]) => {
    return assets.reduce((sum, asset) => sum + asset.value, 0);
  }
};
