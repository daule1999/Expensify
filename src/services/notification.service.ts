import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { Subscription } from './subscription.service';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export const notificationService = {
  requestPermissions: async () => {
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
        trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            timestamp: triggerDate.getTime(),
        },
      });
      return id;
    } catch (error) {
      console.error('Failed to schedule notification:', error);
      return null;
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
