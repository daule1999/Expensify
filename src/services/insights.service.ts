import { db } from '../database';

export interface MonthlyComparison {
  currentMonth: number;
  lastMonth: number;
  percentChange: number;
  direction: 'up' | 'down' | 'same';
}

export interface TopCategory {
  category: string;
  total: number;
  percentage: number;
}

export interface InsightsSummary {
  monthlyComparison: MonthlyComparison;
  topCategories: TopCategory[];
  dailyAverage: number;
  noSpendDays: number;
  totalDaysInMonth: number;
}

export const insightsService = {
  /**
   * Compare spending between current month and last month
   */
  getMonthlyComparison: async (): Promise<MonthlyComparison> => {
    const now = new Date();

    // Current month range
    const currentStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const currentEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).getTime();

    // Last month range
    const lastStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
    const lastEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999).getTime();

    try {
      const currentResult = await db.getFirstAsync<{ total: number }>(
        'SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE date >= ? AND date <= ?',
        [currentStart, currentEnd]
      );
      const lastResult = await db.getFirstAsync<{ total: number }>(
        'SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE date >= ? AND date <= ?',
        [lastStart, lastEnd]
      );

      const currentMonth = currentResult?.total || 0;
      const lastMonth = lastResult?.total || 0;

      let percentChange = 0;
      let direction: 'up' | 'down' | 'same' = 'same';

      if (lastMonth > 0) {
        percentChange = Math.round(((currentMonth - lastMonth) / lastMonth) * 100);
        direction = percentChange > 0 ? 'up' : percentChange < 0 ? 'down' : 'same';
      } else if (currentMonth > 0) {
        percentChange = 100;
        direction = 'up';
      }

      return { currentMonth, lastMonth, percentChange: Math.abs(percentChange), direction };
    } catch (error) {
      console.error('Error getting monthly comparison:', error);
      return { currentMonth: 0, lastMonth: 0, percentChange: 0, direction: 'same' };
    }
  },

  /**
   * Get top N spending categories for current month
   */
  getTopCategories: async (limit: number = 5): Promise<TopCategory[]> => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).getTime();

    try {
      const rows = await db.getAllAsync<{ category: string; total: number }>(
        `SELECT category, SUM(amount) as total FROM expenses 
         WHERE date >= ? AND date <= ? AND category IS NOT NULL 
         GROUP BY category ORDER BY total DESC LIMIT ?`,
        [start, end, limit]
      );

      const grandTotal = rows.reduce((sum, r) => sum + r.total, 0);

      return rows.map(r => ({
        category: r.category,
        total: r.total,
        percentage: grandTotal > 0 ? Math.round((r.total / grandTotal) * 100) : 0,
      }));
    } catch (error) {
      console.error('Error getting top categories:', error);
      return [];
    }
  },

  /**
   * Calculate average daily spend for current month (up to today)
   */
  getDailyAverage: async (): Promise<number> => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const today = now.getTime();
    const daysPassed = Math.max(1, now.getDate()); // At least 1

    try {
      const result = await db.getFirstAsync<{ total: number }>(
        'SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE date >= ? AND date <= ?',
        [start, today]
      );

      return Math.round((result?.total || 0) / daysPassed);
    } catch (error) {
      console.error('Error getting daily average:', error);
      return 0;
    }
  },

  /**
   * Count no-spend days in current month (days with zero expenses)
   */
  getNoSpendDays: async (): Promise<{ noSpendDays: number; totalDays: number }> => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const daysPassed = now.getDate();

    try {
      // Get distinct days that have expenses
      const spendDays = await db.getAllAsync<{ day: string }>(
        `SELECT DISTINCT date(date / 1000, 'unixepoch', 'localtime') as day 
         FROM expenses WHERE date >= ? AND date <= ?`,
        [start.getTime(), now.getTime()]
      );

      const noSpendDays = Math.max(0, daysPassed - spendDays.length);
      return { noSpendDays, totalDays: daysPassed };
    } catch (error) {
      console.error('Error getting no-spend days:', error);
      return { noSpendDays: 0, totalDays: daysPassed };
    }
  },

  /**
   * Get full insights summary
   */
  getSummary: async (): Promise<InsightsSummary> => {
    const [monthlyComparison, topCategories, dailyAverage, streaks] = await Promise.all([
      insightsService.getMonthlyComparison(),
      insightsService.getTopCategories(5),
      insightsService.getDailyAverage(),
      insightsService.getNoSpendDays(),
    ]);

    return {
      monthlyComparison,
      topCategories,
      dailyAverage,
      noSpendDays: streaks.noSpendDays,
      totalDaysInMonth: streaks.totalDays,
    };
  },
};
