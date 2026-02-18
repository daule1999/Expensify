import AsyncStorage from '@react-native-async-storage/async-storage';

// Supported currencies for the currency picker
export const SUPPORTED_CURRENCIES = [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'CHF', symbol: 'Fr', name: 'Swiss Franc' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
  { code: 'SEK', symbol: 'kr', name: 'Swedish Krona' },
  { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar' }
];

export interface CustomField {
  id: string;
  name: string;
  type: 'text' | 'number' | 'date' | 'select';
  options?: string[]; // For select type
  required: boolean;
  enabled: boolean;
}

export interface ExpenseSettings {
  categoryLabel: string; // e.g., "Category" or "Tags"
  defaultCategories: string[];
  customFields: CustomField[];
}

export interface IncomeSettings {
  sourceLabel: string;
  defaultSources: string[];
  customFields: CustomField[];
}

export interface PrivacySettings {
  hideAmounts: boolean;
  requirePasswordToUnhide: boolean;
  useBiometric: boolean; // Use fingerprint/face ID instead of password
  requireLockOnStartup: boolean; // Force unlock screen on app boot
  alwaysHideOnStartup: boolean; // Amounts always hidden when app opens
  autoLockDelay: number; // Idle time in ms before locking (e.g. 120000 for 2 mins)
}

export interface NotificationSettings {
  enabled: boolean;
  upcomingSubscription: boolean;
  emiReminders: boolean;
  budgetAlerts: boolean;
}

export interface ProfileSettings {
  name: string;
  email: string;
  currency: string;
  dateFormat: string; // Global date format preference
  themePreference: 'system' | 'light' | 'dark';
  avatarUrl?: string;
}

export interface AccountSettings {
  accounts: string[]; // List of account names (e.g., 'Cash', 'HDFC Savings')
  defaultAccount: string; // Default account for new transactions
  bankAccounts: BankAccount[]; // Structured bank accounts with last 4 digits
  customBankIdentifiers: string[]; // User-added SMS sender identifiers
  blockedSenders: string[]; // SMS addresses to ignore entirely
  blockedKeywords: string[]; // Keywords that trigger ignoring a message
  customBankMap?: { [key: string]: string }; // User-defined Sender ID -> Bank Name mapping
}

export interface BankAccount {
  id: string;
  name: string; // e.g., 'HDFC Savings'
  bankName: string; // e.g., 'HDFC'
  last4: string; // Last 4 digits of account number
}

export interface BudgetAlertSettings {
  warningThreshold: number; // Percentage (0-100) e.g. 75
  criticalThreshold: number; // Percentage (0-100) e.g. 90
  showOnDashboard: boolean;
}

const DEFAULT_EXPENSE_SETTINGS: ExpenseSettings = {
  categoryLabel: 'Category',
  defaultCategories: ['Food', 'Transport', 'Shopping', 'Entertainment', 'Bills', 'Health', 'Education', 'Other'],
  customFields: []
};

const DEFAULT_INCOME_SETTINGS: IncomeSettings = {
  sourceLabel: 'Source',
  defaultSources: ['Salary', 'Business', 'Freelance', 'Investment', 'Gift', 'Other'],
  customFields: []
};
const DEFAULT_PRIVACY_SETTINGS: PrivacySettings = {
  hideAmounts: false,
  requirePasswordToUnhide: false,
  useBiometric: false,
  requireLockOnStartup: false,
  alwaysHideOnStartup: true, // Default to true as per user request for "hidden by default"
  autoLockDelay: 120000, // 2 minutes
};

const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  enabled: true,
  upcomingSubscription: true,
  emiReminders: true,
  budgetAlerts: true
};

const DEFAULT_PROFILE_SETTINGS: ProfileSettings = {
  name: 'User',
  email: '',
  currency: '₹',
  dateFormat: 'DD/MM/YYYY',
  themePreference: 'system',
  avatarUrl: undefined
};

const DEFAULT_ACCOUNT_SETTINGS: AccountSettings = {
  accounts: ['Cash'], // Cash is always available
  defaultAccount: 'Cash',
  bankAccounts: [],
  customBankIdentifiers: [],
  blockedSenders: [],
  blockedKeywords: ['loan', 'approved', 'pre-approved', 'offer', 'voucher', 'points'],
  customBankMap: {},
};

const EXPENSE_SETTINGS_KEY = '@expense_settings';
const INCOME_SETTINGS_KEY = '@income_settings';
const PRIVACY_SETTINGS_KEY = '@privacy_settings';
const PROFILE_SETTINGS_KEY = '@profile_settings';
const ACCOUNT_SETTINGS_KEY = '@account_settings';
const NOTIFICATION_SETTINGS_KEY = '@notification_settings';
const BUDGET_ALERT_SETTINGS_KEY = '@budget_alert_settings';

const DEFAULT_BUDGET_ALERT_SETTINGS: BudgetAlertSettings = {
  warningThreshold: 75,
  criticalThreshold: 90,
  showOnDashboard: true,
};

export const settingsService = {
  // Expense Settings
  getExpenseSettings: async (): Promise<ExpenseSettings> => {
    try {
      const data = await AsyncStorage.getItem(EXPENSE_SETTINGS_KEY);
      return data ? JSON.parse(data) : DEFAULT_EXPENSE_SETTINGS;
    } catch (error) {
      console.error('Failed to load expense settings:', error);
      return DEFAULT_EXPENSE_SETTINGS;
    }
  },

  saveExpenseSettings: async (settings: ExpenseSettings): Promise<void> => {
    try {
      await AsyncStorage.setItem(EXPENSE_SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Failed to save expense settings:', error);
      throw error;
    }
  },

  resetExpenseSettings: async (): Promise<void> => {
    await AsyncStorage.setItem(EXPENSE_SETTINGS_KEY, JSON.stringify(DEFAULT_EXPENSE_SETTINGS));
  },

  // Income Settings
  getIncomeSettings: async (): Promise<IncomeSettings> => {
    try {
      const data = await AsyncStorage.getItem(INCOME_SETTINGS_KEY);
      return data ? JSON.parse(data) : DEFAULT_INCOME_SETTINGS;
    } catch (error) {
      console.error('Failed to load income settings:', error);
      return DEFAULT_INCOME_SETTINGS;
    }
  },

  saveIncomeSettings: async (settings: IncomeSettings): Promise<void> => {
    try {
      await AsyncStorage.setItem(INCOME_SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Failed to save income settings:', error);
      throw error;
    }
  },

  resetIncomeSettings: async (): Promise<void> => {
    await AsyncStorage.setItem(INCOME_SETTINGS_KEY, JSON.stringify(DEFAULT_INCOME_SETTINGS));
  },

  // Privacy Settings
  getPrivacySettings: async (): Promise<PrivacySettings> => {
    try {
      const data = await AsyncStorage.getItem(PRIVACY_SETTINGS_KEY);
      return data ? JSON.parse(data) : DEFAULT_PRIVACY_SETTINGS;
    } catch (error) {
      console.error('Failed to load privacy settings:', error);
      return DEFAULT_PRIVACY_SETTINGS;
    }
  },

  savePrivacySettings: async (settings: PrivacySettings): Promise<void> => {
    try {
      await AsyncStorage.setItem(PRIVACY_SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Failed to save privacy settings:', error);
      throw error;
    }
  },

  // Profile Settings
  getProfileSettings: async (): Promise<ProfileSettings> => {
    try {
      const data = await AsyncStorage.getItem(PROFILE_SETTINGS_KEY);
      return data ? JSON.parse(data) : DEFAULT_PROFILE_SETTINGS;
    } catch (error) {
      console.error('Failed to load profile settings:', error);
      return DEFAULT_PROFILE_SETTINGS;
    }
  },

  saveProfileSettings: async (settings: ProfileSettings): Promise<void> => {
    try {
      await AsyncStorage.setItem(PROFILE_SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Failed to save profile settings:', error);
      throw error;
    }
  },

  // Helper: Simple password hashing (for demo - use proper crypto in production)
  hashPassword: (password: string): string => {
    // Simple hash for demo purposes - in production use proper crypto
    return Buffer.from(password).toString('base64');
  },

  verifyPassword: (input: string, hashed: string): boolean => {
    return Buffer.from(input).toString('base64') === hashed;
  },

  // Helper: Format date according to settings
  formatDate: (timestamp: number, format: string): string => {
    const date = new Date(timestamp);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    switch (format) {
      case 'MM/DD/YYYY':
        return `${month}/${day}/${year}`;
      case 'DD/MM/YYYY':
        return `${day}/${month}/${year}`;
      case 'YYYY-MM-DD':
        return `${year}-${month}-${day}`;
      default:
        return date.toLocaleDateString();
    }
  },

  // Helper: Format amount (hide if privacy enabled)
  formatAmount: (amount: number, hideAmounts: boolean, currency: string = '₹'): string => {
    if (hideAmounts) {
      return '****';
    }
    return `${currency}${amount.toLocaleString()}`;
  },

  // Account Settings
  getAccountSettings: async (): Promise<AccountSettings> => {
    try {
      const data = await AsyncStorage.getItem(ACCOUNT_SETTINGS_KEY);
      if (data) {
        return JSON.parse(data);
      }
      return DEFAULT_ACCOUNT_SETTINGS;
    } catch (error) {
      console.error('Error loading account settings:', error);
      return DEFAULT_ACCOUNT_SETTINGS;
    }
  },

  saveAccountSettings: async (settings: AccountSettings): Promise<void> => {
    try {
      // Ensure 'Cash' is always in the accounts list
      if (!settings.accounts.includes('Cash')) {
        settings.accounts.unshift('Cash');
      }
      await AsyncStorage.setItem(ACCOUNT_SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving account settings:', error);
      throw error;
    }
  },

  // Bank Identifier Helpers
  getCustomBankIdentifiers: async (): Promise<string[]> => {
    const settings = await settingsService.getAccountSettings();
    return settings.customBankIdentifiers || [];
  },

  getBankAccounts: async (): Promise<BankAccount[]> => {
    const settings = await settingsService.getAccountSettings();
    return settings.bankAccounts || [];
  },

  /**
   * Match an extracted last-4 account number to a stored bank account name
   */
  matchAccountByLast4: async (last4: string): Promise<string | null> => {
    if (!last4 || last4.length < 3) return null;
    const settings = await settingsService.getAccountSettings();
    const cleaned = last4.replace(/[xX]/g, '');
    const match = (settings.bankAccounts || []).find(ba => ba.last4 === cleaned);
    return match ? match.name : null;
  },

  // Notification Settings
  getNotificationSettings: async (): Promise<NotificationSettings> => {
    try {
      const data = await AsyncStorage.getItem(NOTIFICATION_SETTINGS_KEY);
      return data ? JSON.parse(data) : DEFAULT_NOTIFICATION_SETTINGS;
    } catch (error) {
      console.error('Failed to load notification settings:', error);
      return DEFAULT_NOTIFICATION_SETTINGS;
    }
  },

  saveNotificationSettings: async (settings: NotificationSettings): Promise<void> => {
    try {
      await AsyncStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Failed to save notification settings:', error);
      throw error;
    }
  },

  // Budget Alert Settings
  getBudgetAlertSettings: async (): Promise<BudgetAlertSettings> => {
    try {
      const data = await AsyncStorage.getItem(BUDGET_ALERT_SETTINGS_KEY);
      return data ? JSON.parse(data) : DEFAULT_BUDGET_ALERT_SETTINGS;
    } catch (error) {
      console.error('Failed to load budget alert settings:', error);
      return DEFAULT_BUDGET_ALERT_SETTINGS;
    }
  },

  saveBudgetAlertSettings: async (settings: BudgetAlertSettings): Promise<void> => {
    try {
      await AsyncStorage.setItem(BUDGET_ALERT_SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Failed to save budget alert settings:', error);
      throw error;
    }
  },
};
