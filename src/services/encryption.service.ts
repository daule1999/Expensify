import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SALT_KEY = 'encryption_salt';
const VERIFICATION_TOKEN_KEY = 'verification_token';
const ITERATIONS = 10000;

/**
 * Encryption Service (Simplified)
 * Handles encryption/decryption using expo-crypto
 * Note: Full AES implementation requires native modules
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
    try {
      // Generate a random salt
      const salt = await this.generateSalt();
      
      // Derive key from password (simplified version)
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
   * Encrypt data (simplified - using base64 encoding for now)
   * TODO: Implement proper AES encryption when react-native-aes-crypto is added
   */
  async encrypt(data: string): Promise<string> {
    if (!this.isInitialized || !this.derivedKey) {
      throw new Error('Encryption not initialized. Please unlock first.');
    }

    try {
      // For now, just base64 encode (will add proper encryption later)
      const encoded = Buffer.from(data).toString('base64');
      return encoded;
    } catch (error) {
      console.error('Error encrypting data:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt data (simplified)
   */
  async decrypt(encryptedData: string): Promise<string> {
    if (!this.isInitialized || !this.derivedKey) {
      throw new Error('Encryption not initialized. Please unlock first.');
    }

    try {
      // For now, just base64 decode
      const decoded = Buffer.from(encryptedData, 'base64').toString('utf-8');
      return decoded;
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

  private async deriveKey(password: string, salt: string): Promise<string> {
    try {
      // Simple key derivation (will be replaced with PBKDF2 when proper crypto is added)
      const combined = password + salt;
      const digest = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        combined
      );
      return digest;
    } catch (error) {
      console.error('Error deriving key:', error);
      throw new Error('Failed to derive encryption key');
    }
  }

  private async createVerificationToken(key: string): Promise<string> {
    // Hash the key to create a verification token
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
