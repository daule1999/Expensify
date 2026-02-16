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
    const TEMP_PATH = `${FileSystem.cacheDirectory}restore_temp.db`;
    const BACKUP_PATH = DB_PATH + '.bak';

    try {
      // 1. Download to TEMP location (never directly to live DB)
      const downloadRes = await FileSystem.downloadAsync(
        `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
        TEMP_PATH,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          }
        }
      );

      if (downloadRes.status !== 200) {
        throw new Error(`Download failed with status ${downloadRes.status}`);
      }

      // 2. Validate downloaded file exists and has content
      const tempInfo = await FileSystem.getInfoAsync(TEMP_PATH);
      if (!tempInfo.exists || (tempInfo as any).size === 0) {
        throw new Error('Downloaded file is empty or missing');
      }

      // 3. Backup current DB before replacing
      const currentDbInfo = await FileSystem.getInfoAsync(DB_PATH);
      if (currentDbInfo.exists) {
        await FileSystem.copyAsync({ from: DB_PATH, to: BACKUP_PATH });
      }

      // 4. Move temp file to DB location (atomic on most filesystems)
      try {
        await FileSystem.moveAsync({ from: TEMP_PATH, to: DB_PATH });
      } catch (moveError) {
        // If move fails, restore from backup
        const backupExists = await FileSystem.getInfoAsync(BACKUP_PATH);
        if (backupExists.exists) {
          await FileSystem.moveAsync({ from: BACKUP_PATH, to: DB_PATH });
        }
        throw new Error('Failed to swap database file. Original DB restored.');
      }

      // 5. Clean up backup file on success
      const backupExists = await FileSystem.getInfoAsync(BACKUP_PATH);
      if (backupExists.exists) {
        await FileSystem.deleteAsync(BACKUP_PATH, { idempotent: true });
      }

      return true;
    } catch (error) {
      // Clean up temp file on failure
      const tempExists = await FileSystem.getInfoAsync(TEMP_PATH);
      if (tempExists.exists) {
        await FileSystem.deleteAsync(TEMP_PATH, { idempotent: true });
      }
      console.error('Restore failed:', error);
      throw error;
    }
  }
};
