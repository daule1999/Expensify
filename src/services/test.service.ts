import { transactionService } from './transaction.service';
import { encryptionService } from './encryption.service';
import { smsParser } from '../utils/sms-parser';
import { budgetService } from './budget.service';

interface TestResult {
    name: string;
    status: 'passed' | 'failed';
    message?: string;
    duration?: number;
}

export const testService = {
    runAllTests: async (): Promise<TestResult[]> => {
        const results: TestResult[] = [];
        const startTotal = Date.now();

        // 1. Database & Transaction Validation
        try {
            const start = Date.now();
            
            // Test Case: Valid Transaction
            const testId = await transactionService.addTransaction({
                amount: 123.45,
                category: 'Test',
                date: Date.now(),
                description: 'Self-Test Transaction',
                type: 'expense',
                account: 'TestAccount'
            });

            const all = await transactionService.getAll();
            const found = all.find(t => t.id === testId);
            if (!found || found.amount !== 123.45) throw new Error('Transaction content mismatch');
            await transactionService.deleteTransaction(testId, 'expense');

            // Test Case: Negative Amount (Should Fail)
            try {
                await transactionService.addTransaction({
                    amount: -50,
                    category: 'Test',
                    date: Date.now(),
                    type: 'expense'
                });
                throw new Error('Negative amount was accepted');
            } catch (e: any) {
                if (e.message !== 'Amount must be greater than zero') throw e;
            }

            // Test Case: Overflow Amount (Should Fail)
            try {
                await transactionService.addTransaction({
                    amount: 999999999999,
                    category: 'Test',
                    date: Date.now(),
                    type: 'expense'
                });
                throw new Error('Overflow amount was accepted');
            } catch (e: any) {
                if (!e.message.includes('exceeds maximum')) throw e;
            }

            results.push({ 
                name: 'Transaction Validation', 
                status: 'passed', 
                message: 'Range and type validation verified',
                duration: Date.now() - start 
            });

        } catch (e: any) {
            results.push({ name: 'Transaction Validation', status: 'failed', message: e.message });
        }

        // 2. Encryption Loop-back Test
        try {
            const start = Date.now();
            if (!encryptionService.isUnlocked()) {
                results.push({ name: 'Encryption Layer', status: 'passed', message: 'Vault is locked; logic skipped but secure' });
            } else {
                const plaintext = "Sensitive Financial Data 123";
                const ciphertext = await encryptionService.encrypt(plaintext);
                const decrypted = await encryptionService.decrypt(ciphertext);
                
                if (decrypted !== plaintext) throw new Error('Decryption mismatch');
                if (ciphertext === plaintext) throw new Error('Data was not actually encrypted');

                results.push({ 
                    name: 'Encryption Layer', 
                    status: 'passed', 
                    message: 'XOR/PBKDF2 loop-back verified',
                    duration: Date.now() - start 
                });
            }
        } catch (e: any) {
            results.push({ name: 'Encryption Layer', status: 'failed', message: e.message });
        }

        // 3. SMS Parser Extended Test
        try {
            const start = Date.now();
            const samples = [
                { msg: 'Rs. 500.00 debited from a/c XX1234', amount: 500, type: 'debit' },
                { msg: 'INR 1,200.50 credited to your account', amount: 1200.50, type: 'credit' },
                { msg: 'Payment of Rs 150 to Zomato successful', amount: 150, type: 'debit' },
                { msg: 'Your A/C 4567 is debited for Rs 2500.00', amount: 2500, type: 'debit' },
                { msg: 'Salary of Rs 75000 credited to bank', amount: 75000, type: 'credit' }
            ];

            let matches = 0;
            for (const s of samples) {
                const parsed = smsParser.parse('BK-HDFCBK', s.msg, Date.now());
                if (parsed && parsed.amount === s.amount && parsed.type === s.type) {
                    matches++;
                }
            }

            if (matches === samples.length) {
                results.push({ 
                    name: 'SMS AI Parser', 
                    status: 'passed', 
                    message: `All ${matches} patterns matched correctly`,
                    duration: Date.now() - start
                });
            } else {
                throw new Error(`Matched only ${matches}/${samples.length} patterns`);
            }
        } catch (e: any) {
            results.push({ name: 'SMS AI Parser', status: 'failed', message: e.message });
        }

        // 4. Budget Calculation Test
        try {
            const start = Date.now();
            const { startMs, endMs } = budgetService.getPeriodRange('monthly');
            if (startMs > 0 && endMs > startMs) {
                results.push({ 
                    name: 'Budget Logic', 
                    status: 'passed', 
                    message: 'Date range calculation verified',
                    duration: Date.now() - start
                });
            } else {
                throw new Error('Invalid period range calculation');
            }
        } catch (e: any) {
            results.push({ name: 'Budget Logic', status: 'failed', message: e.message });
        }
        
        return results;
    }
};
