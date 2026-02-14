import { Model } from '@nozbe/watermelondb';
import { field, date, readonly } from '@nozbe/watermelondb/decorators';

export class Investment extends Model {
  static table = 'investments';

  @field('name') name!: string;
  @field('type') type!: string;
  @field('amount_invested') amountInvested!: number;
  @field('current_value') currentValue?: number;
  @date('purchase_date') purchaseDate!: Date;
  @field('notes') notes?: string;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  get profitLoss(): number {
    if (!this.currentValue) return 0;
    return this.currentValue - this.amountInvested;
  }

  get profitLossPercentage(): number {
    if (!this.currentValue) return 0;
    return ((this.currentValue - this.amountInvested) / this.amountInvested) * 100;
  }
}
