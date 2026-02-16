import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SALT_KEY = 'encryption_salt';
const VERIFICATION_TOKEN_KEY = 'verification_token';
const ITERATIONS = 10000;
const IV_LENGTH = 16; // 16 bytes for initialization vector

/**
 * Encryption Service
 * Uses XOR-based stream cipher with PBKDF2-like key derivation (SHA-256 × 10,000 iterations)
 * IV is prepended to each encrypted payload for uniqueness
 */
class EncryptionService {
  private derivedKey: string | null = null;
  private isInitialized: boolean = false;

  /**
   * Check if encryption has been set up
   */
  async isSetup(): Promise<boolean> {
    try {
      const salt = await AsyncStorage.getItem(SALT_KEY);
      const verificationToken = await SecureStore.getItemAsync(VERIFICATION_TOKEN_KEY);
      return !!(salt && verificationToken);
    } catch (error) {
      console.error('Error checking encryption setup:', error);
      return false;
    }
  }

  /**
   * Initialize encryption with a master password
   */
  async initialize(masterPassword: string): Promise<void> {
    if (!masterPassword || masterPassword.length < 4) {
      throw new Error('Password must be at least 4 characters');
    }

    try {
      // Generate a random salt
      const salt = await this.generateSalt();
      
      // Derive key from password using iterative hashing
      const key = await this.deriveKey(masterPassword, salt);
      
      // Create a verification token
      const verificationToken = await this.createVerificationToken(key);
      
      // Store salt and verification token
      await AsyncStorage.setItem(SALT_KEY, salt);
      await SecureStore.setItemAsync(VERIFICATION_TOKEN_KEY, verificationToken);
      
      // Cache the derived key
      this.derivedKey = key;
      this.isInitialized = true;
      
      console.log('Encryption initialized successfully');
    } catch (error) {
      console.error('Error initializing encryption:', error);
      throw new Error('Failed to initialize encryption');
    }
  }

  /**
   * Unlock encryption with master password
   */
  async unlock(masterPassword: string): Promise<boolean> {
    try {
      const salt = await AsyncStorage.getItem(SALT_KEY);
      if (!salt) {
        throw new Error('Encryption not initialized');
      }

      // Derive key from password
      const key = await this.deriveKey(masterPassword, salt);
      
      // Verify the password is correct
      const isValid = await this.verifyPassword(key);
      
      if (isValid) {
        this.derivedKey = key;
        this.isInitialized = true;
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error unlocking encryption:', error);
      return false;
    }
  }

  /**
   * Update master password
   */
  async updatePassword(currentPassword: string, newPassword: string): Promise<boolean> {
    try {
      // Verify current password
      const isValid = await this.unlock(currentPassword);
      if (!isValid) {
        return false;
      }

      // Generate new salt
      const newSalt = await this.generateSalt();
      
      // Derive new key
      const newKey = await this.deriveKey(newPassword, newSalt);
      
      // Create new verification token
      const newVerificationToken = await this.createVerificationToken(newKey);
      
      // Update stored values
      await AsyncStorage.setItem(SALT_KEY, newSalt);
      await SecureStore.setItemAsync(VERIFICATION_TOKEN_KEY, newVerificationToken);
      
      // Update cached key
      this.derivedKey = newKey;
      
      console.log('Password updated successfully');
      return true;
    } catch (error) {
      console.error('Error updating password:', error);
      return false;
    }
  }

  /**
   * Encrypt data using XOR stream cipher with random IV
   * Format: base64(IV + XOR(data, keystream))
   */
  async encrypt(data: string): Promise<string> {
    if (!this.isInitialized || !this.derivedKey) {
      throw new Error('Encryption not initialized. Please unlock first.');
    }

    try {
      // Generate random IV
      const ivBytes = await Crypto.getRandomBytesAsync(IV_LENGTH);
      const iv = this.bytesToHex(ivBytes);

      // Generate keystream from key + IV
      const keystream = await this.generateKeystream(this.derivedKey, iv, data.length);
      
      // XOR data with keystream
      const dataBytes = this.stringToBytes(data);
      const encryptedBytes = new Uint8Array(dataBytes.length);
      for (let i = 0; i < dataBytes.length; i++) {
        encryptedBytes[i] = dataBytes[i] ^ keystream[i % keystream.length];
      }

      // Prepend IV (hex) + ':' + encrypted data (hex)
      const encryptedHex = this.bytesToHex(encryptedBytes);
      const payload = iv + ':' + encryptedHex;

      // Base64 encode the whole payload
      return btoa(payload);
    } catch (error) {
      console.error('Error encrypting data:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt data encrypted by encrypt()
   */
  async decrypt(encryptedData: string): Promise<string> {
    if (!this.isInitialized || !this.derivedKey) {
      throw new Error('Encryption not initialized. Please unlock first.');
    }

    try {
      // Decode base64
      const payload = atob(encryptedData);
      const colonIndex = payload.indexOf(':');
      if (colonIndex === -1) {
        throw new Error('Invalid encrypted data format');
      }

      const iv = payload.substring(0, colonIndex);
      const encryptedHex = payload.substring(colonIndex + 1);

      // Convert hex back to bytes
      const encryptedBytes = this.hexToBytes(encryptedHex);

      // Regenerate same keystream
      const keystream = await this.generateKeystream(this.derivedKey, iv, encryptedBytes.length);

      // XOR to decrypt
      const decryptedBytes = new Uint8Array(encryptedBytes.length);
      for (let i = 0; i < encryptedBytes.length; i++) {
        decryptedBytes[i] = encryptedBytes[i] ^ keystream[i % keystream.length];
      }

      return this.bytesToString(decryptedBytes);
    } catch (error) {
      console.error('Error decrypting data:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Lock encryption (clear cached key)
   */
  lock(): void {
    this.derivedKey = null;
    this.isInitialized = false;
  }

  /**
   * Check if encryption is currently unlocked
   */
  isUnlocked(): boolean {
    return this.isInitialized && this.derivedKey !== null;
  }

  // Private helper methods

  private async generateSalt(): Promise<string> {
    const randomBytes = await Crypto.getRandomBytesAsync(16);
    return this.bytesToHex(randomBytes);
  }

  private bytesToHex(bytes: Uint8Array): string {
    return Array.from(bytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  private hexToBytes(hex: string): Uint8Array {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
    }
    return bytes;
  }

  private stringToBytes(str: string): Uint8Array {
    const encoder = new TextEncoder();
    return encoder.encode(str);
  }

  private bytesToString(bytes: Uint8Array): string {
    const decoder = new TextDecoder();
    return decoder.decode(bytes);
  }

  /**
   * Generate a keystream by hashing key+IV iteratively
   * Produces enough bytes to cover the data length
   */
  private async generateKeystream(key: string, iv: string, minLength: number): Promise<Uint8Array> {
    const blocks: Uint8Array[] = [];
    let totalLength = 0;
    let counter = 0;

    while (totalLength < minLength) {
      const blockInput = key + iv + counter.toString();
      const hash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        blockInput
      );
      const hashBytes = this.hexToBytes(hash);
      blocks.push(hashBytes);
      totalLength += hashBytes.length;
      counter++;
    }

    // Concatenate all blocks
    const keystream = new Uint8Array(totalLength);
    let offset = 0;
    for (const block of blocks) {
      keystream.set(block, offset);
      offset += block.length;
    }
    return keystream;
  }

  /**
   * PBKDF2-like key derivation: iterates SHA-256 ITERATIONS times
   */
  private async deriveKey(password: string, salt: string): Promise<string> {
    try {
      let hash = password + salt;
      for (let i = 0; i < ITERATIONS; i++) {
        hash = await Crypto.digestStringAsync(
          Crypto.CryptoDigestAlgorithm.SHA256,
          hash + salt + i.toString()
        );
      }
      return hash;
    } catch (error) {
      console.error('Error deriving key:', error);
      throw new Error('Failed to derive encryption key');
    }
  }

  private async createVerificationToken(key: string): Promise<string> {
    const token = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      'VERIFICATION_TOKEN_V1' + key
    );
    return token;
  }

  private async verifyPassword(key: string): Promise<boolean> {
    try {
      const verificationToken = await SecureStore.getItemAsync(VERIFICATION_TOKEN_KEY);
      if (!verificationToken) {
        return false;
      }

      const expectedToken = await this.createVerificationToken(key);
      return verificationToken === expectedToken;
    } catch (error) {
      return false;
    }
  }
}

// Export singleton instance
export const encryptionService = new EncryptionService();
