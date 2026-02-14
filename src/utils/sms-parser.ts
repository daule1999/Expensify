export interface ParsedTransaction {
  amount: number;
  type: 'debit' | 'credit';
  merchant: string;
  account: string;
  date: number;
  originalSms: string;
}

const PATTERNS = {
  // Generic patterns for Indian banks (HDFC, SBI, ICICI, Axis, etc.)
  // Matches: "Rs. 123.00 debited...", "INR 123.00 spent...", "Debited INR 123.00..."
  debit: [
    /(?:rs\.?|inr)\s*([\d,]+\.?\d*)\s*(?:debited|spent|paid|withdrawn)/i,
    /(?:debited|spent|paid|withdrawn)\s*(?:rs\.?|inr)\s*([\d,]+\.?\d*)/i
  ],
  credit: [
    /(?:rs\.?|inr)\s*([\d,]+\.?\d*)\s*(?:credited|received|deposited|added)/i,
    /(?:credited|received|deposited|added)\s*(?:rs\.?|inr)\s*([\d,]+\.?\d*)/i
  ],
  account: [
    /(?:a\/c|ac|account)\s*(?:no\.?)?\s*([xX]*\d{3,4})/i,
    /(?:ending|ending with|end)\s*([xX]*\d{3,4})/i
  ],
  merchant: [
    /(?:at|to|via)\s+([a-zA-Z0-9\s\.]+?)(?:\s+(?:on|for|using|ref|txn)|$)/i,
    /(?:info:\s*)([a-zA-Z0-9\s\.]+?)(?:\s+(?:on|ref)|$)/i
  ]
};

const IGNORED_SENDERS = [
  'VODA', 'JIO', 'AIRTEL', 'BSNL', 'IDEA', 'TRAI', 'GOVT', 'OFFER', 'PROMO'
];

export const smsParser = {
  parse: (address: string, body: string, timestamp: number): ParsedTransaction | null => {
    // 1. Filter out non-transactional senders
    if (IGNORED_SENDERS.some(sender => address.toUpperCase().includes(sender))) {
      return null;
    }

    // 2. Identify transaction type and amount
    let amount = 0;
    let type: 'debit' | 'credit' | null = null;

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

    if (!type || amount === 0) {
      return null; // Not a transaction message
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

    return {
      amount,
      type,
      merchant,
      account,
      date: timestamp,
      originalSms: body
    };
  },

  isBankSender: (address: string): boolean => {
    // Basic check for 6-character sender ID (common for Indian banks)
    // and checks if it contains common bank identifiers
    const bankIdentifiers = ['BK', 'BNK', 'SBI', 'HDFC', 'ICICI', 'AXIS', 'KOTAK', 'PAYTM', 'GPAY', 'AMZ'];
    const cleanAddress = address.replace(/[^a-zA-Z]/g, '').toUpperCase();
    
    if (cleanAddress.length !== 6) return false; // Most transactional SMS are 6 chars (e.g., AD-HDFCBK)
    
    return bankIdentifiers.some(id => cleanAddress.includes(id));
  }
};
