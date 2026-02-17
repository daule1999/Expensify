import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { DashboardScreen } from '../screens/dashboard/DashboardScreen';
import { ExpensesScreen } from '../screens/expenses/ExpensesScreen';
import { AddExpenseScreen } from '../screens/expenses/AddExpenseScreen';
import { AddIncomeScreen } from '../screens/income/AddIncomeScreen';
import { IncomeScreen } from '../screens/income/IncomeScreen';
import { ExpenseSettingsScreen } from '../screens/settings/ExpenseSettingsScreen';
import { AccountSettingsScreen } from '../screens/settings/AccountSettingsScreen';
import { ReportsScreen } from '../screens/reports/ReportsScreen';
import { SettingsScreen } from '../screens/settings/SettingsScreen';
import { SubscriptionsScreen } from '../screens/subscriptions/SubscriptionsScreen';
import { AddSubscriptionScreen } from '../screens/subscriptions/AddSubscriptionScreen';
import { DebtsScreen } from '../screens/debts/DebtsScreen';
import { AddDebtScreen } from '../screens/debts/AddDebtScreen';
import { DebtDetailsScreen } from '../screens/debts/DebtDetailsScreen';
import { InvestmentsScreen } from '../screens/investments/InvestmentsScreen';
import { AddInvestmentScreen } from '../screens/investments/AddInvestmentScreen';
import { AssetsScreen } from '../screens/assets/AssetsScreen';
import { AddAssetScreen } from '../screens/assets/AddAssetScreen';
import { BudgetScreen } from '../screens/budget/BudgetScreen';
import { AddBudgetScreen } from '../screens/budget/AddBudgetScreen';
import { RecurringScreen } from '../screens/recurring/RecurringScreen';
import { AddRecurringScreen } from '../screens/recurring/AddRecurringScreen';
import { OnboardingScreen } from '../screens/onboarding/OnboardingScreen';
import { CategoryManagerScreen } from '../screens/settings/CategoryManagerScreen';
import { TransactionSearchScreen } from '../screens/expenses/TransactionSearchScreen';
import { UnlockScreen } from '../screens/auth/UnlockScreen';
import { SecuritySetupScreen } from '../screens/auth/SecuritySetupScreen';
import { encryptionService } from '../services/encryption.service';
import { settingsService } from '../services/settings.service';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

import { GlassTabBar } from '../components/GlassTabBar';

const TabNavigator = () => {
    return (
        <Tab.Navigator
            tabBar={(props) => <GlassTabBar {...props} />}
            screenOptions={{
                headerShown: false,
                tabBarShowLabel: false,
                tabBarStyle: { position: 'absolute' }, // Required for transparency behind tab bar
                tabBarBackground: () => null, // Remove default background
            }}
        >
            <Tab.Screen name="Dashboard" component={DashboardScreen} />
            <Tab.Screen name="Expenses" component={ExpensesScreen} />
            <Tab.Screen name="Income" component={IncomeScreen} />
            <Tab.Screen name="Reports" component={ReportsScreen} />
            <Tab.Screen name="Settings" component={SettingsScreen} />
        </Tab.Navigator>
    );
};

export const AppNavigator = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [initialRoute, setInitialRoute] = useState<'Onboarding' | 'Unlock' | 'SecuritySetup' | 'MainTabs'>('Onboarding');

    useEffect(() => {
        checkAppStatus();
    }, []);

    const checkAppStatus = async () => {
        try {
            const hasOnboarded = await AsyncStorage.getItem('has_onboarded');

            if (hasOnboarded !== 'true') {
                setInitialRoute('Onboarding');
            } else {
                // Check if encryption/password is set up
                const isEncrypted = await encryptionService.isSetup();

                if (!isEncrypted) {
                    // User completed onboarding but never set up password
                    setInitialRoute('SecuritySetup');
                } else {
                    // Password exists — check if lock is required
                    const privacySettings = await settingsService.getPrivacySettings();
                    if (privacySettings.requireLockOnStartup) {
                        setInitialRoute('Unlock');
                    } else {
                        setInitialRoute('MainTabs');
                    }
                }
            }
        } catch (e) {
            console.error(e);
            setInitialRoute('MainTabs');
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#2196F3" />
            </View>
        );
    }

    return (
        <NavigationContainer>
            <Stack.Navigator
                initialRouteName={initialRoute}
                screenOptions={{ headerShown: false }}
            >
                <Stack.Screen
                    name="Onboarding"
                    component={OnboardingScreen}
                />
                <Stack.Screen
                    name="Unlock"
                    component={UnlockScreen}
                />
                <Stack.Screen
                    name="SecuritySetup"
                    component={SecuritySetupScreen}
                />
                <Stack.Screen
                    name="MainTabs"
                    component={TabNavigator}
                />
                <Stack.Screen
                    name="AddExpense"
                    component={AddExpenseScreen}
                />
                <Stack.Screen
                    name="AddIncome"
                    component={AddIncomeScreen}
                />
                <Stack.Screen
                    name="ExpenseSettings"
                    component={ExpenseSettingsScreen}
                />
                <Stack.Screen
                    name="AccountSettings"
                    component={AccountSettingsScreen}
                />
                <Stack.Screen
                    name="Subscriptions"
                    component={SubscriptionsScreen}
                />
                <Stack.Screen
                    name="AddSubscription"
                    component={AddSubscriptionScreen}
                />
                <Stack.Screen
                    name="Debts"
                    component={DebtsScreen}
                />
                <Stack.Screen
                    name="AddDebt"
                    component={AddDebtScreen}
                />
                <Stack.Screen
                    name="DebtDetails"
                    component={DebtDetailsScreen}
                />
                <Stack.Screen
                    name="Investments"
                    component={InvestmentsScreen}
                />
                <Stack.Screen
                    name="AddInvestment"
                    component={AddInvestmentScreen}
                />
                <Stack.Screen
                    name="Assets"
                    component={AssetsScreen}
                />
                <Stack.Screen
                    name="AddAsset"
                    component={AddAssetScreen}
                />
                <Stack.Screen
                    name="Budgets"
                    component={BudgetScreen}
                />
                <Stack.Screen
                    name="AddBudget"
                    component={AddBudgetScreen}
                />
                <Stack.Screen
                    name="Recurring"
                    component={RecurringScreen}
                />
                <Stack.Screen
                    name="AddRecurring"
                    component={AddRecurringScreen}
                />
                <Stack.Screen
                    name="CategoryManager"
                    component={CategoryManagerScreen}
                />
                <Stack.Screen
                    name="TransactionSearch"
                    component={TransactionSearchScreen}
                />
            </Stack.Navigator>
        </NavigationContainer>
    );
};
