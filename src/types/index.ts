// Type definitions for the app

export interface ExpenseData {
  id: string;
  amount: number;
  category: string;
  subcategory?: string;
  description?: string;
  date: number;
  paymentMethod?: string;
  tags?: string[];
  isRecurring: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface IncomeData {
  id: string;
  amount: number;
  source: string;
  description?: string;
  date: number;
  createdAt: number;
  updatedAt: number;
}

export interface InvestmentData {
  id: string;
  name: string;
  type: 'stocks' | 'mutual_funds' | 'crypto' | 'gold' | 'real_estate' | 'other';
  amountInvested: number;
  currentValue?: number;
  purchaseDate: number;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export interface AccountData {
  id: string;
  name: string;
  type: 'savings' | 'checking' | 'cash' | 'credit_card' | 'wallet';
  balance: number;
  lastUpdated: number;
  createdAt: number;
  updatedAt: number;
}

export interface DebtData {
  id: string;
  name: string;
  principalAmount: number;
  remainingAmount: number;
  interestRate?: number;
  startDate: number;
  dueDate?: number;
  creditor?: string;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export interface EMIData {
  id: string;
  debtId?: string;
  name: string;
  amount: number;
  startDate: number;
  endDate: number;
  paymentDay: number;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface SubscriptionData {
  id: string;
  name: string;
  amount: number;
  billingCycle: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  startDate: number;
  endDate?: number;
  nextBillingDate?: number;
  category?: string;
  isActive: boolean;
  autoRenew: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface CategoryData {
  id: string;
  name: string;
  type: 'expense' | 'income';
  icon?: string;
  color?: string;
  parentId?: string;
  createdAt: number;
}

export interface BackupMetadata {
  id: string;
  backupDate: number;
  filePath: string;
  fileSize?: number;
  checksum?: string;
  isEncrypted: boolean;
}

export type TimeRange = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'lifetime';

export interface AnalyticsData {
  totalExpenses: number;
  totalIncome: number;
  netSavings: number;
  categoryBreakdown: { category: string; amount: number; percentage: number }[];
  topExpenses: ExpenseData[];
  timeRange: TimeRange;
}
