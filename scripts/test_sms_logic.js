
// scripts/test_sms_logic.js
// This script replicates the logic from src/utils/sms-parser.ts to test it in isolation
// Usage: node scripts/test_sms_logic.js

const PATTERNS = {
    // Comprehensive patterns for Indian banks (HDFC, SBI, ICICI, Axis, Kotak, etc.)
    debit: [
        /(?:rs\.?|inr|usd|\$)\s*([\d,]+\.?\d*)\s*(?:debited|spent|paid|withdrawn|deducted|sent|transferred)/i,
        /(?:debited|spent|paid|withdrawn|deducted|sent|transferred)\s*(?:by|to|of)?\s*(?:rs\.?|inr|usd|\$)?\s*([\d,]+\.?\d*)/i,
        /(?:payment|purchase)\s*(?:of)?\s*(?:rs\.?|inr|usd|\$)\s*([\d,]+\.?\d*)/i,
        /(?:emi)\s*(?:of)?\s*(?:rs\.?|inr|usd|\$)?\s*([\d,]+\.?\d*)\s*(?:debited|deducted|paid)/i,
        /(?:atm)\s*(?:withdrawal|withdrawn)?\s*(?:of)?\s*(?:rs\.?|inr|usd|\$)?\s*([\d,]+\.?\d*)/i,
        /(?:rs\.?|inr|usd|\$)\s*([\d,]+\.?\d*)\s*(?:was|has been)\s*(?:debited|deducted)/i,
    ],
    credit: [
        /(?:rs\.?|inr|usd|\$)\s*([\d,]+\.?\d*)\s*(?:credited|received|deposited|added|refunded|reversed)/i,
        /(?:credited|received|deposited|added|refunded|reversed)\s*(?:by|to|of)?\s*(?:rs\.?|inr|usd|\$)?\s*([\d,]+\.?\d*)/i,
        /(?:cashback|refund|reversal)\s*(?:of)?\s*(?:rs\.?|inr|usd|\$)?\s*([\d,]+\.?\d*)/i,
        /(?:rs\.?|inr|usd|\$)\s*([\d,]+\.?\d*)\s*(?:was|has been)\s*(?:credited|deposited|reversed)/i,
    ],
    account: [
        /(?:a\/c|ac|account)\s*(?:no\.?)?\s*([xX]*\d{3,4})/i,
        /(?:ending|ending with|end)\s*([xX]*\d{3,4})/i,
        /(?:card)\s*(?:no\.?)?\s*(?:ending\s*)?([xX]*\d{4})/i,
        /(?:from)\s*([xX]*\d{3,4})/i,
        /(?:xx|XX)(\d{3,4})/,
    ],
    merchant: [
        /(?:at|to|via|@)\s+([a-zA-Z0-9\s\.@]+?)(?:\s+(?:on|for|using|ref|txn|via)|[.\s]*$)/i,
        /(?:info:\s*)([a-zA-Z0-9\s\.@]+?)(?:\s+(?:on|ref)|[.\s]*$)/i,
        /(?:trf\s+to|paid to|sent to)\s+([a-zA-Z0-9\s\.@]+?)(?:\s+(?:on|ref|via)|[.\s]*$)/i,
    ],
    // Patterns to detect inter-account transfers
    transfer: [
        /(?:neft|imps|rtgs|upi)\s*(?:transfer|trf)?/i,
        /(?:transferred|transfer)\s*(?:to|from)\s*(?:a\/c|ac|account|self)/i,
        /(?:fund\s*transfer|self\s*transfer)/i,
        /(?:your own|own account|between accounts)/i,
    ],
    // Extract the destination account from transfer SMS
    destinationAccount: [
        /(?:to|towards)\s*(?:a\/c|ac|account)\s*(?:no\.?)?\s*([xX]*\d{3,4})/i,
        /(?:beneficiary|credit)\s*(?:a\/c|ac|account)?\s*(?:no\.?)?\s*([xX]*\d{3,4})/i,
        /(?:to)\s*(?:xx|XX)(\d{3,4})/i,
    ]
};

const IGNORED_SENDERS = [
    'VODA', 'JIO', 'AIRTEL', 'BSNL', 'IDEA', 'TRAI', 'GOVT', 'OFFER', 'PROMO',
    'OTP', 'ALERT', 'INFO', 'VERIFY', 'AD-'
];

const smsParser = {
    parse: (address, body, timestamp, bankAccountMappings) => {
        // 0. Guard against empty input
        if (!body || body.trim().length === 0 || !address) {
            return null;
        }

        // 1. Filter out non-transactional senders
        const upperAddress = address.toUpperCase();
        if (IGNORED_SENDERS.some(sender => upperAddress.includes(sender))) {
            return null;
        }

        // 2. Identify transaction type and amount
        let amount = 0;
        let type = null;

        // Check debit patterns
        for (const pattern of PATTERNS.debit) {
            const match = body.match(pattern);
            if (match && match[1]) {
                amount = parseFloat(match[1].replace(/,/g, ''));
                type = 'debit';
                break;
            }
        }

        // Check credit patterns if not debit
        if (!type) {
            for (const pattern of PATTERNS.credit) {
                const match = body.match(pattern);
                if (match && match[1]) {
                    amount = parseFloat(match[1].replace(/,/g, ''));
                    type = 'credit';
                    break;
                }
            }
        }

        // Reject zero or invalid amounts
        if (!type || amount <= 0 || isNaN(amount)) {
            return null;
        }

        // 3. Extract Account Number (last 4 digits)
        let account = 'Unknown';
        for (const pattern of PATTERNS.account) {
            const match = body.match(pattern);
            if (match && match[1]) {
                account = match[1];
                break;
            }
        }

        // 4. Extract Merchant/Payee
        let merchant = 'Unknown Merchant';
        for (const pattern of PATTERNS.merchant) {
            const match = body.match(pattern);
            if (match && match[1]) {
                merchant = match[1].trim();
                break;
            }
        }

        // Clean up merchant name
        if (merchant.toLowerCase().includes('upi')) {
            merchant = 'UPI Transaction';
        }
        // Trim oversized merchant names
        if (merchant.length > 50) {
            merchant = merchant.substring(0, 50) + '...';
        }

        // 5. Detect Self-Transfer keywords
        let isSelfTransfer = false;
        for (const pattern of PATTERNS.transfer) {
            if (pattern.test(body)) {
                isSelfTransfer = true;
                break;
            }
        }

        // 6. Extract Destination Account (for transfer SMS)
        let destinationAccount;
        if (isSelfTransfer) {
            for (const pattern of PATTERNS.destinationAccount) {
                const match = body.match(pattern);
                if (match && match[1]) {
                    destinationAccount = match[1];
                    break;
                }
            }
        }

        return {
            amount,
            type,
            merchant,
            account,
            // accountName: skipped for test script as it depends on mappings
            date: timestamp,
            originalSms: body,
            isSelfTransfer,
            destinationAccount
        };
    }
};


// --- Test Cases ---

const testCases = [
    {
        name: "Standard HDFC Debit",
        sms: { address: "HDFCBK", body: "Rs. 1500.00 debited from a/c 1234 on 12-02-26 to ZOMATO. UPI Ref: 12345678." },
        expected: { type: 'debit', amount: 1500, account: '1234' }
    },
    {
        name: "Standard SBI Debit",
        sms: { address: "SBIUPI", body: "Dear User, INR 450.00 debited from A/c X6789 via UPI for UBER RIDES." },
        expected: { type: 'debit', amount: 450, account: 'X6789' }
    },
    {
        name: "Credit/Salary",
        sms: { address: "HDFC-SALARY", body: "Rs. 50000.00 credited to a/c 1234 on 30-01-26. Salary for Jan." },
        expected: { type: 'credit', amount: 50000, account: '1234' }
    },
    {
        name: "Amazon Pay Bill",
        sms: { address: "AMZPAY", body: "Paid Rs. 2000.00 for electricity bill via Amazon Pay. Txn ID: 998877." },
        expected: { type: 'debit', amount: 2000 }
    },
    {
        name: "Ignored Sender (OTP)",
        sms: { address: "AD-OTP", body: "Your OTP is 123456." },
        expected: null
    },
    {
        name: "Ignored Sender (JIO)",
        sms: { address: "JIO", body: "Plan expired. Recharge now." },
        expected: null
    },
    {
        name: "Invalid Amount", // Should be ignored
        sms: { address: "HDFCBK", body: "Rs. 0.00 deducted." },
        expected: null
    },
    {
        name: "Self Transfer (IMPS)",
        sms: { address: "ICICI", body: "Rs 5000 debited from a/c 1234 IMPS transfer to a/c 9876" },
        expected: { type: 'debit', amount: 5000, isSelfTransfer: true, destinationAccount: '9876' }
    },
    // --- Extended Test Cases ---
    {
        name: "Multi-line SMS with newline",
        sms: { address: "HDFCBK", body: "Alert:\nRs. 100 debited\nfrom a/c 1234." },
        expected: { type: 'debit', amount: 100, account: '1234' }
    },
    {
        name: "Currency without space",
        sms: { address: "SBI", body: "Rs.500.00 debited from X1234" },
        expected: { type: 'debit', amount: 500, account: '1234' }
    },
    {
        name: "INR Currency Symbol",
        sms: { address: "ICICI", body: "INR 2,500.50 spent on card XX9090" },
        expected: { type: 'debit', amount: 2500.50, account: '9090' }
    },
    {
        name: "Date parsing (Mocking non-numeric timestamp string)",
        // In the service, parsed = parseInt("invalid", 10) => NaN.
        // But the parser expects a number.
        // This test checks if the parser handles NaN timestamp gracefully if passed.
        sms: { address: "HDFC", body: "Rs. 100 debited" },
        timestampOverride: NaN,
        expected: { type: 'debit', amount: 100 } // Parser currently passes through whatever date is given
    },
    {
        name: "Merchant with special chars",
        sms: { address: "AXIS", body: "Paid Rs 299 to Netflix.com via Credit Card XX1111" },
        expected: { type: 'debit', amount: 299, merchant: "Netflix.com" }
    },
    {
        name: "UPI Transaction with VPA",
        sms: { address: "UPI", body: "Rs 150.00 sent to ramesh@oksbi via UPI. Ref 1234" },
        expected: { type: 'debit', amount: 150, merchant: "ramesh@oksbi" }
    }
];

console.log("Running SMS Logic Tests...\n");
let passed = 0;
let failed = 0;

testCases.forEach((test, index) => {
    console.log(`Test ${index + 1}: ${test.name}`);
    const timestamp = test.timestampOverride !== undefined ? test.timestampOverride : Date.now();
    const result = smsParser.parse(test.sms.address, test.sms.body, timestamp);

    // Validation
    if (test.expected === null) {
        if (result === null) {
            console.log("  MATCH: Correctly ignored/parsed as null");
            passed++;
        } else {
            console.error("  FAILED: Expected null, got", result);
            failed++;
        }
    } else {
        if (!result) {
            console.error("  FAILED: Expected result, got null");
            failed++;
        } else {
            let match = true;
            if (test.expected.type && result.type !== test.expected.type) { console.error(`  Mismatch Type: Got ${result.type}, Want ${test.expected.type}`); match = false; }
            if (test.expected.amount && result.amount !== test.expected.amount) { console.error(`  Mismatch Amount: Got ${result.amount}, Want ${test.expected.amount}`); match = false; }

            if (test.expected.account && !result.account.includes(test.expected.account.replace(/X/g, ''))) {
                console.error(`  Mismatch Account: Got ${result.account}, Want ${test.expected.account}`); match = false;
            }

            if (test.expected.merchant && !result.merchant.toLowerCase().includes(test.expected.merchant.toLowerCase())) {
                console.error(`  Mismatch Merchant: Got ${result.merchant}, Want ${test.expected.merchant}`); match = false;
            }

            if (test.expected.isSelfTransfer !== undefined && result.isSelfTransfer !== test.expected.isSelfTransfer) {
                console.error(`  Mismatch SelfTransfer: Got ${result.isSelfTransfer}, Want ${test.expected.isSelfTransfer}`); match = false;
            }

            if (match) {
                console.log("  PASSED");
                passed++;
            } else {
                failed++;
            }
        }
    }
    console.log("---------------------------------------------------");
});

console.log(`\nFinal Results: ${passed} Passed, ${failed} Failed.`);

if (failed > 0) process.exit(1);
