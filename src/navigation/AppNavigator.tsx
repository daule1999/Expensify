import React from 'react';
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
    return (
        <NavigationContainer>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
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
            </Stack.Navigator>
        </NavigationContainer>
    );
};
