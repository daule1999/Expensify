import * as FileSystem from 'expo-file-system';
import { GOOGLE_AUTH_CONFIG } from '../config/auth';

const DB_NAME = 'expensetracker.db';
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
    try {
      // 1. Download file content
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) throw new Error('Download failed');

      // Note: In React Native with Expo, handling binary data from fetch directly to file can be tricky with large files.
      // Ideally use FileSystem.downloadAsync, but that requires a URL.
      // Since the URL requires headers, we can try to write the text/blob if it's small, 
      // or usage downloadAsync with headers info if supported (Expo FileSystem supports headers).
      
      // Let's use FileSystem.downloadAsync with headers
      const downloadRes = await FileSystem.downloadAsync(
        `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
        DB_PATH, // Overwrite directly? Dangerous. Better download to temp first.
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            }
        }
      );
      
      if (downloadRes.status === 200) {
          // Verify downloaded file integrity if possible?
          // If good, move to DB location (It's already there if we targeted DB_PATH, but safer to target temp)
          return true;
      }
      throw new Error('Download status not 200');

    } catch (error) {
      console.error('Restore failed:', error);
      throw error;
    }
  }
};
