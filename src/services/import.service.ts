import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { Transaction } from './transaction.service';

export const importService = {
  pickDocument: async (): Promise<DocumentPicker.DocumentPickerResult> => {
    return await DocumentPicker.getDocumentAsync({
      type: ['application/json', 'text/comma-separated-values'],
      copyToCacheDirectory: true
    });
  },

  readJSONFile: async (uri: string): Promise<Transaction[]> => {
    try {
      const content = await FileSystem.readAsStringAsync(uri);
      const data = JSON.parse(content);

      if (!Array.isArray(data)) {
        throw new Error('Invalid format: Root element must be an array');
      }

      // Basic validation
      const isValid = data.every(item => 
        item.amount !== undefined && 
        item.date !== undefined && 
        (item.type === 'expense' || item.type === 'income')
      );

      if (!isValid) {
        throw new Error('Invalid format: Missing required fields');
      }

      return data as Transaction[];
    } catch (error) {
      console.error('Error reading JSON file:', error);
      throw error;
    }
  }
};
