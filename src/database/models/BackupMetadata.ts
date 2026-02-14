import { Model } from '@nozbe/watermelondb';
import { field, date, readonly } from '@nozbe/watermelondb/decorators';

export class BackupMetadata extends Model {
  static table = 'backup_metadata';

  @date('backup_date') backupDate!: Date;
  @field('file_path') filePath!: string;
  @field('file_size') fileSize?: number;
  @field('checksum') checksum?: string;
  @field('is_encrypted') isEncrypted!: boolean;
}
