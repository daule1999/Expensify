import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { transactionService, Transaction } from '../../services/transaction.service';
import { AmountDisplay } from '../../components/AmountDisplay';
import { AccountFilter } from '../../components/AccountFilter';
import { useTheme } from '../../contexts/ThemeContext';
import { GlassHeader } from '../../components/GlassHeader';
import { GlassCard } from '../../components/GlassCard';

const { width } = Dimensions.get('window');

interface CategoryTotal {
    category: string;
    total: number;
    count: number;
    percentage: number;
}

interface MonthlyData {
    month: string;
    income: number;
    expenses: number;
    balance: number;
}

type PeriodType = 'today' | 'week' | 'month' | 'year';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const ReportsScreen = () => {
    const { theme, isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const [period, setPeriod] = useState<PeriodType>('month');
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [totalIncome, setTotalIncome] = useState(0);
    const [totalExpenses, setTotalExpenses] = useState(0);
    const [balance, setBalance] = useState(0);
    const [topExpenseCategories, setTopExpenseCategories] = useState<CategoryTotal[]>([]);
    const [topIncomeCategories, setTopIncomeCategories] = useState<CategoryTotal[]>([]);
    const [monthlyTrend, setMonthlyTrend] = useState<MonthlyData[]>([]);
    const [transactionCount, setTransactionCount] = useState({ income: 0, expenses: 0 });
    const [selectedAccount, setSelectedAccount] = useState('All Accounts');

    useFocusEffect(
        React.useCallback(() => {
            loadReportData();
        }, [period, selectedDate, selectedAccount])
    );

    const getDateRange = () => {
        const endDate = new Date(selectedDate);
        const startDate = new Date(selectedDate);

        switch (period) {
            case 'today':
                startDate.setHours(0, 0, 0, 0);
                endDate.setHours(23, 59, 59, 999);
                break;
            case 'week':
                const dayOfWeek = startDate.getDay();
                startDate.setDate(startDate.getDate() - dayOfWeek);
                startDate.setHours(0, 0, 0, 0);
                endDate.setDate(startDate.getDate() + 6);
                endDate.setHours(23, 59, 59, 999);
                break;
            case 'month':
                startDate.setDate(1);
                startDate.setHours(0, 0, 0, 0);
                endDate.setMonth(endDate.getMonth() + 1, 0);
                endDate.setHours(23, 59, 59, 999);
                break;
            case 'year':
                startDate.setMonth(0, 1);
                startDate.setHours(0, 0, 0, 0);
                endDate.setMonth(11, 31);
                endDate.setHours(23, 59, 59, 999);
                break;
        }
        return { startDate, endDate };
    };

    const loadReportData = async () => {
        const { startDate, endDate } = getDateRange();
        const allTransactions = await transactionService.getAll(
            selectedAccount === 'All Accounts' ? undefined : selectedAccount
        );

        const filteredTransactions = allTransactions.filter(t => {
            const txDate = new Date(t.date);
            return txDate >= startDate && txDate <= endDate;
        });

        const income = filteredTransactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0);

        const expenses = filteredTransactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);

        setTotalIncome(income);
        setTotalExpenses(expenses);
        setBalance(income - expenses);

        setTransactionCount({
            income: filteredTransactions.filter(t => t.type === 'income').length,
            expenses: filteredTransactions.filter(t => t.type === 'expense').length
        });

        calculateCategoryTotals(filteredTransactions);

        if (period === 'year') {
            calculateMonthlyTrend(filteredTransactions);
        }
    };

    const calculateCategoryTotals = (transactions: Transaction[]) => {
        const expensesByCategory: { [key: string]: { total: number; count: number } } = {};
        const incomeByCategory: { [key: string]: { total: number; count: number } } = {};

        transactions.forEach(t => {
            const category = t.category || 'Uncategorized';
            if (t.type === 'expense') {
                if (!expensesByCategory[category]) expensesByCategory[category] = { total: 0, count: 0 };
                expensesByCategory[category].total += t.amount;
                expensesByCategory[category].count += 1;
            } else {
                if (!incomeByCategory[category]) incomeByCategory[category] = { total: 0, count: 0 };
                incomeByCategory[category].total += t.amount;
                incomeByCategory[category].count += 1;
            }
        });

        const totalExpenseAmount = Object.values(expensesByCategory).reduce((sum, cat) => sum + cat.total, 0);
        const totalIncomeAmount = Object.values(incomeByCategory).reduce((sum, cat) => sum + cat.total, 0);

        setTopExpenseCategories(Object.entries(expensesByCategory)
            .map(([category, data]) => ({
                category,
                total: data.total,
                count: data.count,
                percentage: totalExpenseAmount > 0 ? (data.total / totalExpenseAmount) * 100 : 0
            }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 5));

        setTopIncomeCategories(Object.entries(incomeByCategory)
            .map(([category, data]) => ({
                category,
                total: data.total,
                count: data.count,
                percentage: totalIncomeAmount > 0 ? (data.total / totalIncomeAmount) * 100 : 0
            }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 5));
    };

    const calculateMonthlyTrend = (transactions: Transaction[]) => {
        const monthlyData: { [key: string]: { income: number; expenses: number } } = {};
        transactions.forEach(t => {
            const date = new Date(t.date);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            if (!monthlyData[monthKey]) monthlyData[monthKey] = { income: 0, expenses: 0 };
            if (t.type === 'income') monthlyData[monthKey].income += t.amount;
            else monthlyData[monthKey].expenses += t.amount;
        });

        setMonthlyTrend(Object.entries(monthlyData)
            .map(([month, data]) => ({
                month: new Date(month + '-01').toLocaleDateString('default', { month: 'short' }),
                income: data.income,
                expenses: data.expenses,
                balance: data.income - data.expenses
            }))
            .sort((a, b) => a.month.localeCompare(b.month))
            .slice(-6));
    };

    const getBarColor = (index: number) => {
        const colors = [theme.colors.primary, theme.colors.secondary, theme.colors.success, theme.colors.warning, theme.colors.info, theme.colors.error];
        return colors[index % colors.length];
    };

    const getPeriodLabel = () => {
        const date = selectedDate;
        switch (period) {
            case 'today': return date.toLocaleDateString('default', { month: 'short', day: 'numeric' });
            case 'week':
                const weekStart = new Date(date);
                weekStart.setDate(date.getDate() - date.getDay());
                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekStart.getDate() + 6);
                return `${weekStart.toLocaleDateString('default', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('default', { month: 'short', day: 'numeric' })}`;
            case 'month': return date.toLocaleDateString('default', { month: 'long', year: 'numeric' });
            case 'year': return date.getFullYear().toString();
        }
    };

    const navigateDate = (direction: 'prev' | 'next') => {
        const newDate = new Date(selectedDate);
        const add = direction === 'next' ? 1 : -1;
        switch (period) {
            case 'today': newDate.setDate(newDate.getDate() + add); break;
            case 'week': newDate.setDate(newDate.getDate() + (add * 7)); break;
            case 'month': newDate.setMonth(newDate.getMonth() + add); break;
            case 'year': newDate.setFullYear(newDate.getFullYear() + add); break;
        }
        setSelectedDate(newDate);
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
            <LinearGradient
                colors={isDark ? ['#1A0033', '#000000'] : ['#E0EAFC', '#CFDEF3']}
                style={StyleSheet.absoluteFill}
            />

            <GlassHeader title="Reports" />

            <ScrollView contentContainerStyle={styles.content}>

                {/* Account Filter */}
                <View style={styles.filterContainer}>
                    <AccountFilter
                        selectedAccount={selectedAccount}
                        onSelectAccount={setSelectedAccount}
                    />
                </View>

                {/* Period Selector */}
                <GlassCard style={styles.periodCard}>
                    <View style={styles.periodSelector}>
                        {(['today', 'week', 'month', 'year'] as const).map((p) => (
                            <TouchableOpacity
                                key={p}
                                style={[
                                    styles.periodButton,
                                    period === p && { backgroundColor: theme.colors.primary }
                                ]}
                                onPress={() => setPeriod(p)}
                            >
                                <Text style={[
                                    styles.periodText,
                                    { color: period === p ? '#FFF' : theme.colors.text }
                                ]}>
                                    {p.charAt(0).toUpperCase() + p.slice(1)}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Date Navigator */}
                    <View style={styles.dateNavigator}>
                        <TouchableOpacity onPress={() => navigateDate('prev')}>
                            <Ionicons name="chevron-back" size={24} color={theme.colors.primary} />
                        </TouchableOpacity>

                        <TouchableOpacity onPress={() => setSelectedDate(new Date())}>
                            <Text style={[styles.dateLabelText, { color: theme.colors.text }]}>{getPeriodLabel()}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity onPress={() => navigateDate('next')}>
                            <Ionicons name="chevron-forward" size={24} color={theme.colors.primary} />
                        </TouchableOpacity>
                    </View>
                </GlassCard>

                {/* Summary Cards */}
                <View style={styles.summaryContainer}>
                    <GlassCard style={styles.summaryCard}>
                        <Ionicons name="trending-up" size={24} color={theme.colors.success} />
                        <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>Income</Text>
                        <AmountDisplay amount={totalIncome} style={{ color: theme.colors.text, fontSize: 18, fontWeight: 'bold' }} size="medium" />
                        <Text style={[styles.summaryCount, { color: theme.colors.textSecondary }]}>{transactionCount.income} txs</Text>
                    </GlassCard>

                    <GlassCard style={styles.summaryCard}>
                        <Ionicons name="trending-down" size={24} color={theme.colors.error} />
                        <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>Expenses</Text>
                        <AmountDisplay amount={totalExpenses} style={{ color: theme.colors.text, fontSize: 18, fontWeight: 'bold' }} size="medium" />
                        <Text style={[styles.summaryCount, { color: theme.colors.textSecondary }]}>{transactionCount.expenses} txs</Text>
                    </GlassCard>

                    <GlassCard style={styles.summaryCard}>
                        <Ionicons name="wallet" size={24} color={theme.colors.info} />
                        <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>Balance</Text>
                        <AmountDisplay amount={balance} style={{ color: theme.colors.text, fontSize: 18, fontWeight: 'bold' }} size="medium" />
                    </GlassCard>
                </View>

                {/* Top Expense Categories */}
                {topExpenseCategories.length > 0 && (
                    <GlassCard style={styles.sectionCard}>
                        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Top Expense Categories</Text>
                        {topExpenseCategories.map((cat, index) => (
                            <View key={cat.category} style={styles.categoryItem}>
                                <View style={styles.categoryHeader}>
                                    <View style={styles.categoryInfo}>
                                        <View style={[styles.categoryDot, { backgroundColor: getBarColor(index) }]} />
                                        <Text style={[styles.categoryName, { color: theme.colors.text }]}>{cat.category}</Text>
                                    </View>
                                    <AmountDisplay amount={cat.total} size="small" style={{ color: theme.colors.text }} />
                                </View>
                                <View style={[styles.progressBar, { backgroundColor: theme.colors.border }]}>
                                    <View
                                        style={[
                                            styles.progressFill,
                                            {
                                                width: `${cat.percentage}%`,
                                                backgroundColor: getBarColor(index)
                                            }
                                        ]}
                                    />
                                </View>
                                <Text style={[styles.categoryStats, { color: theme.colors.textSecondary }]}>
                                    {cat.count} txs • {cat.percentage.toFixed(1)}%
                                </Text>
                            </View>
                        ))}
                    </GlassCard>
                )}

                {/* Top Income Sources */}
                {topIncomeCategories.length > 0 && (
                    <GlassCard style={styles.sectionCard}>
                        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Top Income Sources</Text>
                        {topIncomeCategories.map((cat, index) => (
                            <View key={cat.category} style={styles.categoryItem}>
                                <View style={styles.categoryHeader}>
                                    <View style={styles.categoryInfo}>
                                        <View style={[styles.categoryDot, { backgroundColor: getBarColor(index) }]} />
                                        <Text style={[styles.categoryName, { color: theme.colors.text }]}>{cat.category}</Text>
                                    </View>
                                    <AmountDisplay amount={cat.total} size="small" style={{ color: theme.colors.text }} />
                                </View>
                                <View style={[styles.progressBar, { backgroundColor: theme.colors.border }]}>
                                    <View
                                        style={[
                                            styles.progressFill,
                                            {
                                                width: `${cat.percentage}%`,
                                                backgroundColor: getBarColor(index)
                                            }
                                        ]}
                                    />
                                </View>
                                <Text style={[styles.categoryStats, { color: theme.colors.textSecondary }]}>
                                    {cat.count} txs • {cat.percentage.toFixed(1)}%
                                </Text>
                            </View>
                        ))}
                    </GlassCard>
                )}

                {/* Monthly Trend (Year view only) */}
                {period === 'year' && monthlyTrend.length > 0 && (
                    <GlassCard style={styles.sectionCard}>
                        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Monthly Trend</Text>
                        {monthlyTrend.map((data, index) => (
                            <View key={index} style={styles.trendItem}>
                                <Text style={[styles.trendMonth, { color: theme.colors.textSecondary }]}>{data.month}</Text>
                                <View style={styles.trendBars}>
                                    <View style={[styles.trendBar, { backgroundColor: theme.colors.border }]}>
                                        <View style={[styles.trendBarFill, { width: `${(data.income / Math.max(...monthlyTrend.map(m => m.income))) * 100}%`, backgroundColor: theme.colors.success }]} />
                                    </View>
                                    <View style={[styles.trendBar, { backgroundColor: theme.colors.border }]}>
                                        <View style={[styles.trendBarFill, { width: `${(data.expenses / Math.max(...monthlyTrend.map(m => m.expenses))) * 100}%`, backgroundColor: theme.colors.error }]} />
                                    </View>
                                </View>
                                <AmountDisplay amount={data.balance} size="small" style={{ color: theme.colors.text, width: 80, textAlign: 'right' }} />
                            </View>
                        ))}
                    </GlassCard>
                )}

            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        padding: 16,
        paddingTop: 110,
        paddingBottom: 120, // TabBar overlap
    },
    filterContainer: {
        marginBottom: 10,
    },
    periodCard: {
        padding: 10,
        marginBottom: 16,
    },
    periodSelector: {
        flexDirection: 'row',
        marginBottom: 15,
        gap: 8,
    },
    periodButton: {
        flex: 1,
        paddingVertical: 8,
        paddingHorizontal: 4,
        borderRadius: 8,
        alignItems: 'center',
    },
    periodText: {
        fontSize: 12,
        fontWeight: '600',
    },
    dateNavigator: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 10,
    },
    dateLabelText: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    summaryContainer: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 16,
    },
    summaryCard: {
        flex: 1,
        padding: 10,
        alignItems: 'center',
    },
    summaryLabel: {
        fontSize: 12,
        marginTop: 4,
        marginBottom: 4,
    },
    summaryCount: {
        fontSize: 10,
        marginTop: 2,
    },
    sectionCard: {
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 16,
    },
    categoryItem: {
        marginBottom: 16,
    },
    categoryHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    categoryInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    categoryDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    categoryName: {
        fontSize: 15,
        fontWeight: '600',
    },
    progressBar: {
        height: 8,
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: 4,
    },
    progressFill: {
        height: '100%',
        borderRadius: 4,
    },
    categoryStats: {
        fontSize: 12,
    },
    trendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 12,
    },
    trendMonth: {
        width: 40,
        fontSize: 12,
        fontWeight: '600',
    },
    trendBars: {
        flex: 1,
        gap: 4,
    },
    trendBar: {
        height: 6,
        borderRadius: 3,
        overflow: 'hidden',
    },
    trendBarFill: {
        height: '100%',
    },
});
