import { Model } from '@nozbe/watermelondb';
import { field, date, readonly } from '@nozbe/watermelondb/decorators';

export class Income extends Model {
  static table = 'income';

  @field('amount') amount!: number;
  @field('source') source!: string;
  @field('description') description?: string;
  @date('date') date!: Date;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
}
