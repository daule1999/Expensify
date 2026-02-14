import * as SQLite from 'expo-sqlite';

// Open database
const db = SQLite.openDatabaseSync('expensify.db');

// Helper function to generate unique IDs
export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Insert default categories
const insertDefaultCategories = async () => {
  const defaultCategories = [
    { name: 'Food & Dining', type: 'expense', icon: '🍔', color: '#FF6B6B' },
    { name: 'Transportation', type: 'expense', icon: '🚗', color: '#4ECDC4' },
    { name: 'Shopping', type: 'expense', icon: '🛍️', color: '#95E1D3' },
    { name: 'Entertainment', type: 'expense', icon: '🎬', color: '#F38181' },
    { name: 'Bills & Utilities', type: 'expense', icon: '💡', color: '#AA96DA' },
    { name: 'Healthcare', type: 'expense', icon: '🏥', color: '#FCBAD3' },
    { name: 'Education', type: 'expense', icon: '📚', color: '#A8D8EA' },
    { name: 'Other', type: 'expense', icon: '📌', color: '#C7CEEA' },
    { name: 'Salary', type: 'income', icon: '💰', color: '#4CAF50' },
    { name: 'Business', type: 'income', icon: '💼', color: '#8BC34A' },
    { name: 'Investments', type: 'income', icon: '📈', color: '#CDDC39' },
    { name: 'Other Income', type: 'income', icon: '💵', color: '#FFC107' },
  ];

  for (const category of defaultCategories) {
    const id = generateId();
    const now = Date.now();
    await db.runAsync(
      'INSERT INTO categories (id, name, type, icon, color, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [id, category.name, category.type, category.icon, category.color, now]
    );
  }

  console.log('Default categories inserted');
};

// Initialize database tables
export const initializeDatabase = async () => {
  try {
    // Create expenses table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS expenses (
        id TEXT PRIMARY KEY,
        amount REAL NOT NULL,
        category TEXT NOT NULL,
        subcategory TEXT,
        description TEXT,
        date INTEGER NOT NULL,
        payment_method TEXT,
        tags TEXT,
        is_recurring INTEGER DEFAULT 0,
        account TEXT DEFAULT 'Cash',
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `);

    // Create income table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS income (
        id TEXT PRIMARY KEY,
        amount REAL NOT NULL,
        source TEXT NOT NULL,
        description TEXT,
        date INTEGER NOT NULL,
        account TEXT DEFAULT 'Cash',
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `);

    // Create investments table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS investments (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        amount_invested REAL NOT NULL,
        current_value REAL,
        purchase_date INTEGER NOT NULL,
        notes TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `);

    // Create assets table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS assets (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        value REAL NOT NULL,
        purchase_date INTEGER NOT NULL,
        notes TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `);

    // Create accounts table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS accounts (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        balance REAL NOT NULL,
        last_updated INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `);

    // Create debts table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS debts (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        principal_amount REAL NOT NULL,
        remaining_amount REAL NOT NULL,
        interest_rate REAL,
        start_date INTEGER NOT NULL,
        due_date INTEGER,
        creditor TEXT,
        notes TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `);

    // Create emis table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS emis (
        id TEXT PRIMARY KEY,
        debt_id TEXT,
        name TEXT NOT NULL,
        amount REAL NOT NULL,
        start_date INTEGER NOT NULL,
        end_date INTEGER NOT NULL,
        payment_day INTEGER NOT NULL,
        is_active INTEGER DEFAULT 1,
        notification_id TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (debt_id) REFERENCES debts(id)
      );
    `);

    // Create subscriptions table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        amount REAL NOT NULL,
        billing_cycle TEXT NOT NULL,
        start_date INTEGER NOT NULL,
        end_date INTEGER,
        next_billing_date INTEGER,
        category TEXT,
        is_active INTEGER DEFAULT 1,
        auto_renew INTEGER DEFAULT 1,
        notification_id TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `);

    // Create categories table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        icon TEXT,
        color TEXT,
        parent_id TEXT,
        created_at INTEGER NOT NULL
      );
    `);

    // Create backup_metadata table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS backup_metadata (
        id TEXT PRIMARY KEY,
        backup_date INTEGER NOT NULL,
        file_path TEXT NOT NULL,
        file_size INTEGER,
        checksum TEXT,
        is_encrypted INTEGER DEFAULT 1
      );
    `);

    // Create audit_logs table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        action TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        old_value TEXT,
        new_value TEXT,
        user_id TEXT,
        timestamp INTEGER NOT NULL,
        metadata TEXT
      );
    `);

    console.log('Database initialized successfully');
    
    // Insert default categories if none exist
    const result = await db.getFirstAsync('SELECT COUNT(*) as count FROM categories') as { count: number } | null;
    if (result && result.count === 0) {
      await insertDefaultCategories();
    }

    // Migration: Add account column to existing tables if not exists
    try {
      await db.execAsync(`ALTER TABLE expenses ADD COLUMN account TEXT DEFAULT 'Cash';`);
      // console.log('Added account column to expenses table');
    } catch (error) {
      // Column might already exist, ignore error
    }

    try {
      await db.execAsync(`ALTER TABLE income ADD COLUMN account TEXT DEFAULT 'Cash';`);
      // console.log('Added account column to income table');
    } catch (error) {
      // Column might already exist, ignore error
    }

    // Migration: Add emi_amount column to debts table
    try {
      await db.execAsync(`ALTER TABLE debts ADD COLUMN emi_amount REAL DEFAULT 0;`);
      // console.log('Added emi_amount column to debts table');
    } catch (error) {
      // Column might already exist, ignore error
    }

    // Migration: Add notification_id column to subscriptions table
    try {
      await db.execAsync(`ALTER TABLE subscriptions ADD COLUMN notification_id TEXT;`);
      // console.log('Added notification_id column to subscriptions table');
    } catch (error) {
      // Column might already exist, ignore error
    }

  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
};

// Export database instance
export { db };
