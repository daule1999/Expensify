import { Model } from '@nozbe/watermelondb';
import { field, date, readonly } from '@nozbe/watermelondb/decorators';

export class Expense extends Model {
  static table = 'expenses';

  @field('amount') amount!: number;
  @field('category') category!: string;
  @field('subcategory') subcategory?: string;
  @field('description') description?: string;
  @date('date') date!: Date;
  @field('payment_method') paymentMethod?: string;
  @field('tags') tagsJson?: string;
  @field('is_recurring') isRecurring!: boolean;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  get tags(): string[] {
    return this.tagsJson ? JSON.parse(this.tagsJson) : [];
  }

  setTags(tags: string[]) {
    this.tagsJson = JSON.stringify(tags);
  }
}
