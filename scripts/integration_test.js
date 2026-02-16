
const crypto = require('crypto');
const EventEmitter = require('events');

// --- MOCK ENVIRONMENT ---

// 1. Mock Database (Memory)
const mockDb = {
    tables: {
        expenses: [],
        income: [],
        budgets: [],
        audit_logs: [],
        settings: []
    },
    runAsync: async (query, params) => {
        // Simple regex-based insert/delete simulation
        if (query.includes('INSERT INTO expenses')) {
            const [id, amount, category, description, date, account, created_at, updated_at] = params;
            mockDb.tables.expenses.push({ id, amount, category, description, date, account, created_at, updated_at });
        } else if (query.includes('INSERT INTO income')) {
            const [id, amount, source, description, date, account, created_at, updated_at] = params;
            mockDb.tables.income.push({ id, amount, source, description, date, account, created_at, updated_at });
        } else if (query.includes('INSERT INTO audit_logs')) {
            const [id, action, entity, entityId, oldData, newData, timestamp] = params;
            mockDb.tables.audit_logs.push({ id, action, entity, entityId, oldData, newData, timestamp });
        } else if (query.includes('INSERT INTO budgets')) {
            const [id, category, amount, period, is_active, created_at] = params;
            mockDb.tables.budgets.push({ id, category, amount, period, is_active, created_at });
        }
    },
    getAllAsync: async (query, params = []) => {
        if (query.includes('FROM expenses')) return mockDb.tables.expenses;
        if (query.includes('FROM income')) return mockDb.tables.income;
        if (query.includes('FROM budgets')) return mockDb.tables.budgets;
        return [];
    },
    getFirstAsync: async (query, params = []) => {
        if (query.includes('FROM budgets')) {
            return mockDb.tables.budgets.find(b => b.category === params[0] && b.is_active === 1) || null;
        }
        return null;
    },
    clear: () => {
        Object.keys(mockDb.tables).forEach(k => mockDb.tables[k] = []);
    }
};

// 2. Mock Notifications (Event Based)
const notifications = new EventEmitter();

// 3. Mock Services Logic (Simplified Integration)
const integrationServices = {
    addTransaction: async (data) => {
        const id = crypto.randomUUID();
        const now = Date.now();

        // Validation
        if (data.amount <= 0) throw new Error('Invalid amount');

        if (data.type === 'expense') {
            await mockDb.runAsync('INSERT INTO expenses', [id, data.amount, data.category, data.description, data.date, data.account, now, now]);

            // Budget Check Simulation
            const budget = await mockDb.getFirstAsync('SELECT FROM budgets', [data.category]);
            if (budget) {
                const totalSpent = mockDb.tables.expenses
                    .filter(e => e.category === data.category)
                    .reduce((sum, e) => sum + e.amount, 0);

                if (totalSpent > budget.amount) {
                    notifications.emit('alert', { title: 'Budget Exceeded', body: `Spent ${totalSpent} on ${data.category}` });
                }
            }
        } else {
            await mockDb.runAsync('INSERT INTO income', [id, data.amount, data.source, data.description, data.date, data.account, now, now]);
        }

        // Audit Log Entry
        await mockDb.runAsync('INSERT INTO audit_logs', [crypto.randomUUID(), 'CREATE', data.type, id, null, JSON.stringify(data), now]);
        return id;
    },

    syncSms: async (address, body) => {
        // Simplified Parser logic
        if (body.toLowerCase().includes('debited') || body.toLowerCase().includes('paid')) {
            const amountMatch = body.match(/(?:rs\.?|inr)\s*([\d,]+\.?\d*)/i);
            if (amountMatch) {
                const amount = parseFloat(amountMatch[1].replace(/,/g, ''));
                await integrationServices.addTransaction({
                    amount,
                    type: 'expense',
                    category: 'SMS Sync',
                    description: `Auto-sync: ${body.substring(0, 20)}...`,
                    date: Date.now(),
                    account: 'Bank'
                });
                return true;
            }
        }
        return false;
    }
};

// --- TEST SUITE ---

const results = [];
function test(name, fn) {
    try {
        fn().then(() => {
            results.push({ name, status: 'PASSED' });
        }).catch(e => {
            results.push({ name, status: 'FAILED', error: e.message });
        });
    } catch (e) {
        results.push({ name, status: 'FAILED', error: e.message });
    }
}

async function runAll() {
    console.log('--- STARTING INTEGRATION & E2E SIMULATION ---');

    // Case 1: Manually Add Expense -> DB -> Audit
    await (async () => {
        const name = "E2E: Add Expense & Audit Loopback";
        try {
            mockDb.clear();
            await integrationServices.addTransaction({
                amount: 1500,
                type: 'expense',
                category: 'Food',
                description: 'Dinner',
                date: Date.now(),
                account: 'Cash'
            });

            if (mockDb.tables.expenses.length !== 1) throw new Error('Expense not in DB');
            if (mockDb.tables.audit_logs.length !== 1) throw new Error('Audit log missing');
            results.push({ name, status: 'PASSED' });
        } catch (e) { results.push({ name, status: 'FAILED', error: e.message }); }
    })();

    // Case 2: Manually Add Income
    await (async () => {
        const name = "E2E: Add Income Flow";
        try {
            await integrationServices.addTransaction({
                amount: 50000,
                type: 'income',
                source: 'Salary',
                description: 'Feb Salary',
                date: Date.now(),
                account: 'Bank'
            });
            if (mockDb.tables.income.length !== 1) throw new Error('Income not in DB');
            results.push({ name, status: 'PASSED' });
        } catch (e) { results.push({ name, status: 'FAILED', error: e.message }); }
    })();

    // Case 3: Integration: SMS Notification -> Parsing -> DB
    await (async () => {
        const name = "Integration: SMS Event to DB Record";
        try {
            const smsBody = "Rs 200 debited for Uber";
            const synced = await integrationServices.syncSms('HDFCBK', smsBody);

            if (!synced) throw new Error('Sync failed to parse');
            const entry = mockDb.tables.expenses.find(e => e.amount === 200);
            if (!entry) throw new Error('SMS transaction missing from DB');
            results.push({ name, status: 'PASSED' });
        } catch (e) { results.push({ name, status: 'FAILED', error: e.message }); }
    })();

    // Case 4: End-to-End: Budget Exceeded -> Push Notification
    await (async () => {
        const name = "E2E: Budget Limit -> Alert Event";
        try {
            let alertReceived = false;
            notifications.once('alert', (data) => {
                if (data.title === 'Budget Exceeded') alertReceived = true;
            });

            // Set a budget of 1000 for 'Shopping'
            await mockDb.runAsync('INSERT INTO budgets', ['b-1', 'Shopping', 1000, 'monthly', 1, Date.now()]);

            // Add expense of 1200 for 'Shopping'
            await integrationServices.addTransaction({
                amount: 1200,
                type: 'expense',
                category: 'Shopping',
                description: 'New shoes',
                date: Date.now(),
                account: 'Cash'
            });

            // Wait a micro-task for event emit
            await new Promise(r => setTimeout(r, 10));

            if (!alertReceived) throw new Error('Budget alert event NOT emitted');
            results.push({ name, status: 'PASSED' });
        } catch (e) { results.push({ name, status: 'FAILED', error: e.message }); }
    })();

    console.log('\n--- INTEGRATION TEST REPORT ---');
    console.table(results);
    const allPassed = results.every(r => r.status === 'PASSED');
    console.log(allPassed ? '✅ ALL INTEGRATION TESTS PASSED' : '❌ SOME INTEGRATION TESTS FAILED');
    if (!allPassed) process.exit(1);
    process.exit(0);
}

runAll();
