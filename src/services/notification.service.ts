import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { Subscription } from './subscription.service';
import { Debt } from './debt.service';

try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: false,
    }),
  });
} catch (error) {
  console.warn('Error setting notification handler:', error);
}

export const notificationService = {
  requestPermissions: async () => {
    try {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      return finalStatus === 'granted';
    } catch (error) {
      console.warn('Error requesting notification permissions:', error);
      return false;
    }
  },

  scheduleRenewalNotification: async (subscription: Subscription): Promise<string | null> => {
    if (!subscription.next_billing_date) return null;

    const billingDate = new Date(subscription.next_billing_date);
    // Schedule 3 days before
    const triggerDate = new Date(billingDate);
    triggerDate.setDate(triggerDate.getDate() - 3);

    // If trigger date is in the past, don't schedule (or schedule for today if very close? logic says 3 days before)
    // If we are already within the 3 days window, maybe schedule for "tomorrow" or "now"?
    // For now, only schedule if trigger date is in future.
    if (triggerDate.getTime() < Date.now()) {
        return null; 
    }

    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Upcoming Subscription Renewal',
          body: `Your ${subscription.name} subscription of ${subscription.amount} is due on ${billingDate.toLocaleDateString()}.`,
          data: { subscriptionId: subscription.id },
        },
        trigger: { date: triggerDate } as any,
      });
      return id;
    } catch (error) {
      console.error('Failed to schedule notification:', error);
      return null;
    }
  },

  scheduleEmiNotification: async (debt: Debt): Promise<string | null> => {
    if (!debt.due_date) return null;

    const dueDate = new Date(debt.due_date);
    // Schedule 2 days before
    const triggerDate = new Date(dueDate);
    triggerDate.setDate(triggerDate.getDate() - 2);

    if (triggerDate.getTime() < Date.now()) {
        return null; 
    }

    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'EMI Payment Due',
          body: `Your EMI for "${debt.name}" of ₹${debt.emi_amount || debt.remaining_amount} is due on ${dueDate.toLocaleDateString()}.`,
          data: { debtId: debt.id },
        },
        trigger: { date: triggerDate } as any,
      });
      return id;
    } catch (error) {
      console.error('Failed to schedule EMI notification:', error);
      return null;
    }
  },

  showBudgetAlert: async (category: string, amount: number, limit: number) => {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '⚠️ Budget Alert',
          body: `You've spent ₹${amount} on ${category}, which exceeds your limit of ₹${limit}!`,
          data: { category },
        },
        trigger: null, // Show immediately
      });
    } catch (error) {
      console.error('Failed to show budget alert:', error);
    }
  },

  cancelNotification: async (notificationId: string) => {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    } catch (error) {
      console.error('Failed to cancel notification:', error);
    }
  }
};
