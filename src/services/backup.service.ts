import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { Platform } from 'react-native';
import { GOOGLE_AUTH_CONFIG } from '../config/auth';

const DB_NAME = 'expensify.db';
const DB_PATH = `${FileSystem.documentDirectory}SQLite/${DB_NAME}`;

export const backupService = {
  // Helper to get access token (In a real app, manage this via Auth Context)
  getAccessToken: async (response: any) => {
    if (response?.type === 'success') {
      return response.authentication.accessToken;
    }
    return null;
  },

  uploadBackup: async (accessToken: string) => {
    try {
      // 1. Check if DB exists
      const fileInfo = await FileSystem.getInfoAsync(DB_PATH);
      if (!fileInfo.exists) {
        throw new Error('Database file not found');
      }

      // 2. Read DB file as Base64
      const fileContent = await FileSystem.readAsStringAsync(DB_PATH, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // 3. Construct Multipart Body
      const metadata = {
        name: `backup_${new Date().toISOString()}.db`,
        parents: ['appDataFolder'],
        mimeType: 'application/x-sqlite3',
      };

      const boundary = 'foo_bar_baz';
      const body = `
--${boundary}
Content-Type: application/json; charset=UTF-8

${JSON.stringify(metadata)}

--${boundary}
Content-Type: application/x-sqlite3
Content-Transfer-Encoding: base64

${fileContent}
--${boundary}--`;

      // 4. Upload to Google Drive
      const uploadResponse = await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': `multipart/related; boundary=${boundary}`,
          },
          body: body,
        }
      );

      const result = await uploadResponse.json();
      if (uploadResponse.ok) {
        return result;
      } else {
        throw new Error(result.error?.message || 'Upload failed');
      }
    } catch (error) {
      console.error('Backup failed:', error);
      throw error;
    }
  },

  listBackups: async (accessToken: string) => {
    try {
      const response = await fetch(
        'https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&fields=files(id, name, createdTime, size)',
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      const data = await response.json();
      return data.files || [];
    } catch (error) {
      console.error('List backups failed:', error);
      throw error;
    }
  },

  restoreBackup: async (accessToken: string, fileId: string) => {
    // ... existing code ...
  },

  createLocalBackup: async (): Promise<void> => {
    try {
      const fileInfo = await FileSystem.getInfoAsync(DB_PATH);
      if (!fileInfo.exists) {
        throw new Error('Database file not found');
      }

      if (!(await Sharing.isAvailableAsync())) {
        throw new Error('Sharing is not available on this device');
      }

      await Sharing.shareAsync(DB_PATH, {
        dialogTitle: 'Save Backup',
        mimeType: 'application/x-sqlite3',
        UTI: 'public.database'
      });
    } catch (error) {
      console.error('Local backup failed:', error);
      throw error;
    }
  },

  restoreLocalBackup: async (): Promise<boolean> => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/x-sqlite3', 'application/octet-stream', 'application/vnd.sqlite3'],
        copyToCacheDirectory: true
      });

      if (result.canceled) return false;

      const sourceUri = result.assets[0].uri;
      
      // Basic validation: Check magic header or just try to open? 
      // For now, assume it's valid if user picked it. 
      // We reusing the logic from restoreBackup would be DRY, but restoreBackup takes accessToken/fileId. 
      // Let's refactor `restoreFromUri` logic if possible, but for now copying the swap logic is safer/faster than refactoring.
      
      const TEMP_PATH = `${FileSystem.cacheDirectory}restore_local_temp.db`;
      const BACKUP_PATH = DB_PATH + '.bak';

      // Copy picked file to temp
      await FileSystem.copyAsync({ from: sourceUri, to: TEMP_PATH });

      // Identify if valid DB? (Skip for now, relying on try/catch of sqlite open later or just file presence)

      // Backup current
      const currentDbInfo = await FileSystem.getInfoAsync(DB_PATH);
      if (currentDbInfo.exists) {
        await FileSystem.copyAsync({ from: DB_PATH, to: BACKUP_PATH });
      }

      // Swap
      try {
        await FileSystem.moveAsync({ from: TEMP_PATH, to: DB_PATH });
        
        // Reload app or notify user to restart? 
        // SQLite might need closing/reopening. expo-sqlite doesn't expose close() easily in older versions, 
        // but typically a reload is best.
        return true;
      } catch (moveError) {
         // Restore backup
         if ((await FileSystem.getInfoAsync(BACKUP_PATH)).exists) {
           await FileSystem.moveAsync({ from: BACKUP_PATH, to: DB_PATH });
         }
         throw moveError;
      }
    } catch (error) {
      console.error('Restore local failed:', error);
      throw error;
    }
  }
};
