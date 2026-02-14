import { Model } from '@nozbe/watermelondb';
import { field, date, readonly, relation } from '@nozbe/watermelondb/decorators';
import { Relation } from '@nozbe/watermelondb';
import { Debt } from './Debt';

export class EMI extends Model {
  static table = 'emis';

  @field('debt_id') debtId?: string;
  @field('name') name!: string;
  @field('amount') amount!: number;
  @date('start_date') startDate!: Date;
  @date('end_date') endDate!: Date;
  @field('payment_day') paymentDay!: number;
  @field('is_active') isActive!: boolean;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  @relation('debts', 'debt_id') debt?: Relation<Debt>;

  get totalPayments(): number {
    const months = this.getMonthsDifference(this.startDate, this.endDate);
    return months;
  }

  get totalAmount(): number {
    return this.amount * this.totalPayments;
  }

  private getMonthsDifference(start: Date, end: Date): number {
    return (
      (end.getFullYear() - start.getFullYear()) * 12 +
      (end.getMonth() - start.getMonth())
    );
  }
}
