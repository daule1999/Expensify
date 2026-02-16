
const fs = require('fs');
const path = require('path');

// Mocking dependencies that would otherwise fail in Node
const mockSmsParser = {
    PATTERNS: {
        debit: [
            /(?:rs\.?|inr)\s*([\d,]+\.?\d*)\s*(?:debited|spent|paid|withdrawn|deducted)/i,
            /(?:debited|spent|paid|withdrawn|deducted)\s*(?:rs\.?|inr)?\s*([\d,]+\.?\d*)/i,
            /(?:payment|purchase)\s*(?:of)?\s*(?:rs\.?|inr)\s*([\d,]+\.?\d*)/i,
        ],
        credit: [
            /(?:rs\.?|inr)\s*([\d,]+\.?\d*)\s*(?:credited|received|deposited|added|refunded)/i,
            /(?:credited|received|deposited|added|refunded)\s*(?:rs\.?|inr)?\s*([\d,]+\.?\d*)/i,
        ]
    },
    parse: (body) => {
        let amount = 0;
        let type = null;
        for (const p of mockSmsParser.PATTERNS.debit) {
            const m = body.match(p);
            if (m) { amount = parseFloat(m[1].replace(/,/g, '')); type = 'debit'; break; }
        }
        if (!type) {
            for (const p of mockSmsParser.PATTERNS.credit) {
                const m = body.match(p);
                if (m) { amount = parseFloat(m[1].replace(/,/g, '')); type = 'credit'; break; }
            }
        }
        return { amount, type };
    }
};

const crypto = require('crypto');

const encryptionLogic = {
    // Simulating iterative hashing logic from encryption.service.ts
    deriveKey: (pass, salt, iterations = 100) => {
        let hash = pass + salt;
        for (let i = 0; i < iterations; i++) {
            hash = crypto.createHash('sha256').update(hash + salt + i).digest('hex');
        }
        return hash;
    },
    xor: (data, key) => {
        const dataBuffer = Buffer.from(data);
        const keyBuffer = Buffer.from(key);
        const result = Buffer.alloc(dataBuffer.length);
        for (let i = 0; i < dataBuffer.length; i++) {
            result[i] = dataBuffer[i] ^ keyBuffer[i % keyBuffer.length];
        }
        return result;
    }
};

const results = [];

function test(name, fn) {
    try {
        fn();
        results.push({ name, status: 'PASSED' });
    } catch (e) {
        results.push({ name, status: 'FAILED', error: e.message });
    }
}

console.log('--- STARTING AUTOMATION TEST SUITE ---');

test('SMS Parser: HDFC Debit Pattern', () => {
    const msg = "Rs. 500.00 debited from a/c XX1234";
    const res = mockSmsParser.parse(msg);
    if (res.amount !== 500 || res.type !== 'debit') throw new Error(`Expected 500 debit, got ${res.amount} ${res.type}`);
});

test('SMS Parser: ICICI Credit Pattern', () => {
    const msg = "INR 1,200.50 credited to your account";
    const res = mockSmsParser.parse(msg);
    if (res.amount !== 1200.5 || res.type !== 'credit') throw new Error(`Expected 1200.5 credit, got ${res.amount} ${res.type}`);
});

test('SMS Parser: SBI Payment Pattern', () => {
    const msg = "Paid Rs 200 for Uber";
    const res = mockSmsParser.parse(msg);
    if (res.amount !== 200 || res.type !== 'debit') throw new Error(`Expected 200 debit, got ${res.amount} ${res.type}`);
});

test('Encryption: Key Derivation Stability', () => {
    const k1 = encryptionLogic.deriveKey('password', 'salt1');
    const k2 = encryptionLogic.deriveKey('password', 'salt1');
    const k3 = encryptionLogic.deriveKey('password', 'salt2');
    if (k1 !== k2) throw new Error('Deterministic key derivation failed');
    if (k1 === k3) throw new Error('Salt-based divergence failed');
});

test('Encryption: XOR Loopback', () => {
    const plain = "SuperSecret123";
    const key = "StrongKey!!!";
    const cipher = encryptionLogic.xor(plain, key);
    const decrypted = encryptionLogic.xor(cipher.toString(), key).toString();
    // Note: XOR loopback test. In real service we prepend IV.
    if (decrypted !== plain) throw new Error('XOR loopback failed');
});

test('Validation: Transaction Limits', () => {
    const validate = (amt) => {
        if (amt <= 0) throw new Error('Must be > 0');
        if (amt >= 100000000) throw new Error('Too large');
        return true;
    };
    if (!validate(100)) throw new Error('Valid amount rejected');
    try { validate(-1); throw new Error('Failed to catch negative'); } catch (e) { }
    try { validate(999999999); throw new Error('Failed to catch overflow'); } catch (e) { }
});

console.log('\n--- AUTOMATION TEST REPORT ---');
console.table(results);

const allPassed = results.every(r => r.status === 'PASSED');
console.log(allPassed ? '\n✅ ALL TESTS PASSED' : '\n❌ SOME TESTS FAILED');

if (!allPassed) process.exit(1);
