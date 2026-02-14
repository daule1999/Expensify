import { Model } from '@nozbe/watermelondb';
import { field, date, readonly } from '@nozbe/watermelondb/decorators';

export class Subscription extends Model {
  static table = 'subscriptions';

  @field('name') name!: string;
  @field('amount') amount!: number;
  @field('billing_cycle') billingCycle!: string;
  @date('start_date') startDate!: Date;
  @date('end_date') endDate?: Date;
  @date('next_billing_date') nextBillingDate?: Date;
  @field('category') category?: string;
  @field('is_active') isActive!: boolean;
  @field('auto_renew') autoRenew!: boolean;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  get monthlyEquivalent(): number {
    switch (this.billingCycle) {
      case 'daily':
        return this.amount * 30;
      case 'weekly':
        return this.amount * 4;
      case 'monthly':
        return this.amount;
      case 'quarterly':
        return this.amount / 3;
      case 'yearly':
        return this.amount / 12;
      default:
        return this.amount;
    }
  }
}
