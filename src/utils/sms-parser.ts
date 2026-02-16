export interface ParsedTransaction {
  amount: number;
  type: 'debit' | 'credit';
  merchant: string;
  account: string;
  accountName?: string; // Matched bank account name from settings
  date: number;
  originalSms: string;
}

export interface BankAccountMapping {
  last4: string;
  name: string;
}

const PATTERNS = {
  // Comprehensive patterns for Indian banks (HDFC, SBI, ICICI, Axis, Kotak, etc.)
  debit: [
    /(?:rs\.?|inr)\s*([\d,]+\.?\d*)\s*(?:debited|spent|paid|withdrawn|deducted)/i,
    /(?:debited|spent|paid|withdrawn|deducted)\s*(?:rs\.?|inr)?\s*([\d,]+\.?\d*)/i,
    /(?:payment|purchase)\s*(?:of)?\s*(?:rs\.?|inr)\s*([\d,]+\.?\d*)/i,
    /(?:emi)\s*(?:of)?\s*(?:rs\.?|inr)?\s*([\d,]+\.?\d*)\s*(?:debited|deducted|paid)/i,
    /(?:atm)\s*(?:withdrawal|withdrawn)?\s*(?:rs\.?|inr)?\s*([\d,]+\.?\d*)/i,
    /(?:rs\.?|inr)\s*([\d,]+\.?\d*)\s*(?:was|has been)\s*(?:debited|deducted)/i,
  ],
  credit: [
    /(?:rs\.?|inr)\s*([\d,]+\.?\d*)\s*(?:credited|received|deposited|added|refunded)/i,
    /(?:credited|received|deposited|added|refunded)\s*(?:rs\.?|inr)?\s*([\d,]+\.?\d*)/i,
    /(?:cashback|refund)\s*(?:of)?\s*(?:rs\.?|inr)?\s*([\d,]+\.?\d*)/i,
    /(?:rs\.?|inr)\s*([\d,]+\.?\d*)\s*(?:was|has been)\s*(?:credited|deposited)/i,
  ],
  account: [
    /(?:a\/c|ac|account)\s*(?:no\.?)?\s*([xX]*\d{3,4})/i,
    /(?:ending|ending with|end)\s*([xX]*\d{3,4})/i,
    /(?:card)\s*(?:no\.?)?\s*(?:ending\s*)?([xX]*\d{4})/i,
    /(?:xx|XX)(\d{3,4})/,
  ],
  merchant: [
    /(?:at|to|via|@)\s+([a-zA-Z0-9\s\.]+?)(?:\s+(?:on|for|using|ref|txn|via)|[.\s]*$)/i,
    /(?:info:\s*)([a-zA-Z0-9\s\.]+?)(?:\s+(?:on|ref)|[.\s]*$)/i,
    /(?:trf\s+to|paid to|sent to)\s+([a-zA-Z0-9\s\.@]+?)(?:\s+(?:on|ref|via)|[.\s]*$)/i,
  ]
};

const IGNORED_SENDERS = [
  'VODA', 'JIO', 'AIRTEL', 'BSNL', 'IDEA', 'TRAI', 'GOVT', 'OFFER', 'PROMO',
  'OTP', 'ALERT', 'INFO', 'VERIFY', 'AD-'
];

export const smsParser = {
  parse: (address: string, body: string, timestamp: number, bankAccountMappings?: BankAccountMapping[]): ParsedTransaction | null => {
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

    return {
      amount,
      type,
      merchant,
      account,
      accountName: smsParser.matchAccountName(account, bankAccountMappings),
      date: timestamp,
      originalSms: body
    };
  },

  /**
   * Match extracted account number (last 4 digits) to a stored bank account name
   */
  matchAccountName: (extractedLast4: string, mappings?: BankAccountMapping[]): string | undefined => {
    if (!mappings || mappings.length === 0 || !extractedLast4) return undefined;
    const cleaned = extractedLast4.replace(/[xX]/g, '');
    if (cleaned.length < 3) return undefined;
    const match = mappings.find(m => cleaned.endsWith(m.last4) || m.last4.endsWith(cleaned));
    return match?.name;
  },

  isBankSender: (address: string, customIdentifiers?: string[]): boolean => {
    if (!address) return false;
    
    // Bank SMS can come in multiple formats:
    // 6-char alphanumeric (e.g., AD-HDFCBK, VM-SBIINB)
    // Short codes (e.g., 56161, 9215XX)
    // Full sender IDs
    const builtInIdentifiers = [
      'BK', 'BNK', 'SBI', 'HDFC', 'ICICI', 'AXIS', 'KOTAK', 'PAYTM', 
      'GPAY', 'AMZ', 'BOB', 'PNB', 'UBI', 'CITI', 'YES', 'IDBI', 
      'INDUS', 'RBL', 'FEDERAL', 'CANARA', 'UNION', 'BAJAJ'
    ];
    
    // Merge with any user-added identifiers
    const allIdentifiers = customIdentifiers && customIdentifiers.length > 0
      ? [...new Set([...builtInIdentifiers, ...customIdentifiers.map(id => id.toUpperCase())])]
      : builtInIdentifiers;
    
    const cleanAddress = address.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    
    // Check for bank identifiers (relaxed length check)
    if (cleanAddress.length >= 5 && cleanAddress.length <= 12) {
      return allIdentifiers.some(id => cleanAddress.includes(id));
    }
    
    // Check for numeric short codes (5-6 digits, common for banks)
    if (/^\d{5,6}$/.test(cleanAddress)) {
      return true; // Most 5-6 digit senders are transactional
    }

    return false;
  },

  /**
   * Generate a hash for SMS deduplication
   */
  generateSmsHash: (address: string, body: string, timestamp: number): string => {
    // Use first 100 chars of body + sender + date (truncated to day)
    const dayTimestamp = Math.floor(timestamp / 86400000);
    return `${address}:${body.substring(0, 100)}:${dayTimestamp}`;
  }
};
