import { Model } from '@nozbe/watermelondb';
import { field, date, readonly } from '@nozbe/watermelondb/decorators';

export class Debt extends Model {
  static table = 'debts';

  @field('name') name!: string;
  @field('principal_amount') principalAmount!: number;
  @field('remaining_amount') remainingAmount!: number;
  @field('interest_rate') interestRate?: number;
  @date('start_date') startDate!: Date;
  @date('due_date') dueDate?: Date;
  @field('creditor') creditor?: string;
  @field('notes') notes?: string;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  get amountPaid(): number {
    return this.principalAmount - this.remainingAmount;
  }

  get percentagePaid(): number {
    return (this.amountPaid / this.principalAmount) * 100;
  }
}
