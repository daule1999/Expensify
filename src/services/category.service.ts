import { db } from '../database';
import * as Crypto from 'expo-crypto';

export interface Category {
  id: string;
  name: string;
  type: 'expense' | 'income';
  icon?: string;
  color?: string;
  parent_id?: string;
  created_at: number;
}

// Predefined icon options for the picker
export const CATEGORY_ICONS = [
  'fast-food-outline', 'car-outline', 'cart-outline', 'game-controller-outline',
  'receipt-outline', 'medkit-outline', 'school-outline', 'ellipsis-horizontal-outline',
  'home-outline', 'airplane-outline', 'gift-outline', 'shirt-outline',
  'cafe-outline', 'fitness-outline', 'musical-notes-outline', 'paw-outline',
  'construct-outline', 'phone-portrait-outline', 'laptop-outline', 'book-outline',
  'briefcase-outline', 'cash-outline', 'trending-up-outline', 'wallet-outline',
  'card-outline', 'sparkles-outline', 'heart-outline', 'star-outline',
];

// Predefined color palette
export const CATEGORY_COLORS = [
  '#FF6B6B', '#FF8E53', '#FFC107', '#4CAF50', '#2196F3', '#9C27B0',
  '#E91E63', '#00BCD4', '#607D8B', '#795548', '#3F51B5', '#009688',
  '#FF5722', '#673AB7', '#03A9F4', '#8BC34A', '#CDDC39', '#FF9800',
];

export const categoryService = {
  getAll: async (type?: 'expense' | 'income'): Promise<Category[]> => {
    try {
      if (type) {
        return await db.getAllAsync<Category>(
          'SELECT * FROM categories WHERE type = ? ORDER BY name ASC',
          [type]
        );
      }
      return await db.getAllAsync<Category>(
        'SELECT * FROM categories ORDER BY type ASC, name ASC'
      );
    } catch (error) {
      console.error('Error fetching categories:', error);
      return [];
    }
  },

  getById: async (id: string): Promise<Category | null> => {
    try {
      return await db.getFirstAsync<Category>(
        'SELECT * FROM categories WHERE id = ?', [id]
      );
    } catch (error) {
      console.error('Error fetching category:', error);
      return null;
    }
  },

  add: async (data: { name: string; type: 'expense' | 'income'; icon?: string; color?: string }): Promise<string> => {
    if (!data.name || data.name.trim().length === 0) {
      throw new Error('Category name is required');
    }

    // Check for duplicate name within same type
    const existing = await db.getFirstAsync<Category>(
      'SELECT * FROM categories WHERE LOWER(name) = ? AND type = ?',
      [data.name.trim().toLowerCase(), data.type]
    );
    if (existing) {
      throw new Error(`Category "${data.name}" already exists for ${data.type}`);
    }

    const id = Crypto.randomUUID();
    const now = Date.now();

    await db.runAsync(
      'INSERT INTO categories (id, name, type, icon, color, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [id, data.name.trim(), data.type, data.icon || null, data.color || null, now]
    );

    return id;
  },

  update: async (id: string, updates: Partial<Pick<Category, 'name' | 'icon' | 'color'>>): Promise<void> => {
    const fields = Object.keys(updates).filter(k => ['name', 'icon', 'color'].includes(k));
    if (fields.length === 0) return;

    // If renaming, check for duplicates
    if (updates.name) {
      const existing = await db.getFirstAsync<Category>('SELECT * FROM categories WHERE id = ?', [id]);
      if (existing) {
        const duplicate = await db.getFirstAsync<Category>(
          'SELECT * FROM categories WHERE LOWER(name) = ? AND type = ? AND id != ?',
          [updates.name.trim().toLowerCase(), existing.type, id]
        );
        if (duplicate) {
          throw new Error(`Category "${updates.name}" already exists`);
        }
      }
    }

    const setClause = fields.map(k => `${k} = ?`).join(', ');
    const values = fields.map(k => (updates as any)[k]);
    values.push(id);

    await db.runAsync(`UPDATE categories SET ${setClause} WHERE id = ?`, values);
  },

  delete: async (id: string): Promise<void> => {
    // Check if category is used by any transactions
    const category = await db.getFirstAsync<Category>('SELECT * FROM categories WHERE id = ?', [id]);
    if (!category) throw new Error('Category not found');

    const usage = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM expenses WHERE category = ?',
      [category.name]
    );

    if (usage && usage.count > 0) {
      throw new Error(`Cannot delete "${category.name}" — it is used by ${usage.count} transaction(s). Reassign them first.`);
    }

    await db.runAsync('DELETE FROM categories WHERE id = ?', [id]);
  },

  // Get just the category names (for use in dropdowns, etc.)
  getNames: async (type: 'expense' | 'income'): Promise<string[]> => {
    const cats = await categoryService.getAll(type);
    return cats.map(c => c.name);
  },
};
