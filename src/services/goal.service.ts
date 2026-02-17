import { db, generateId } from '../database';

export interface Goal {
  id: string;
  name: string;
  target_amount: number;
  saved_amount: number;
  deadline?: number; // timestamp
  icon?: string;
  color?: string;
  status: 'active' | 'completed' | 'archived';
  created_at: number;
  updated_at: number;
}

export const goalService = {
  addGoal: async (goal: Omit<Goal, 'id' | 'created_at' | 'updated_at' | 'saved_amount' | 'status'>): Promise<Goal> => {
    const id = generateId();
    const now = Date.now();
    const newGoal: Goal = {
      ...goal,
      id,
      saved_amount: 0,
      status: 'active',
      created_at: now,
      updated_at: now,
    };

    try {
      await db.runAsync(
        `INSERT INTO goals (id, name, target_amount, saved_amount, deadline, icon, color, status, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          newGoal.id,
          newGoal.name,
          newGoal.target_amount,
          newGoal.saved_amount,
          newGoal.deadline || null,
          newGoal.icon || 'trophy-outline',
          newGoal.color || '#4CAF50',
          newGoal.status,
          newGoal.created_at,
          newGoal.updated_at,
        ]
      );
      return newGoal;
    } catch (error) {
      console.error('Error adding goal:', error);
      throw error;
    }
  },

  updateGoal: async (goal: Goal): Promise<void> => {
    const now = Date.now();
    try {
      await db.runAsync(
        `UPDATE goals SET name = ?, target_amount = ?, saved_amount = ?, deadline = ?, icon = ?, color = ?, status = ?, updated_at = ? WHERE id = ?`,
        [
          goal.name,
          goal.target_amount,
          goal.saved_amount,
          goal.deadline || null,
          goal.icon || null,
          goal.color || null,
          goal.status || 'active',
          now,
          goal.id,
        ]
      );
    } catch (error) {
      console.error('Error updating goal:', error);
      throw error;
    }
  },

  deleteGoal: async (id: string): Promise<void> => {
    try {
      await db.runAsync('DELETE FROM goals WHERE id = ?', [id]);
    } catch (error) {
      console.error('Error deleting goal:', error);
      throw error;
    }
  },

  getGoals: async (): Promise<Goal[]> => {
    try {
      // Return active goals first, sorted by deadline (nearest first) or created_at
      const result = await db.getAllAsync<Goal>(
        `SELECT * FROM goals WHERE status != 'archived' ORDER BY status ASC, deadline ASC, created_at DESC`
      );
      return result;
    } catch (error) {
      console.error('Error fetching goals:', error);
      return [];
    }
  },

  getGoalById: async (id: string): Promise<Goal | null> => {
    try {
      const result = await db.getFirstAsync<Goal>('SELECT * FROM goals WHERE id = ?', [id]);
      return result || null;
    } catch (error) {
      console.error('Error fetching goal by id:', error);
      return null;
    }
  },

  addFunds: async (id: string, amount: number): Promise<void> => {
    try {
      const goal = await goalService.getGoalById(id);
      if (!goal) throw new Error('Goal not found');

      const newAmount = goal.saved_amount + amount;
      let status = goal.status;
      
      // Auto-complete if target reached
      if (newAmount >= goal.target_amount && goal.status === 'active') {
        status = 'completed';
      } else if (newAmount < goal.target_amount && goal.status === 'completed') {
        status = 'active'; // Re-activate if funds withdrawn below target
      }

      await db.runAsync(
        `UPDATE goals SET saved_amount = ?, status = ?, updated_at = ? WHERE id = ?`,
        [newAmount, status, Date.now(), id]
      );
    } catch (error) {
      console.error('Error adding funds to goal:', error);
      throw error;
    }
  }
};
