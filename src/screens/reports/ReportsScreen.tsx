import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { PieChart, LineChart } from 'react-native-chart-kit';

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
    color: string;
    legendFontColor: string;
    legendFontSize: number;
}

interface MonthlyData {
    month: string;
    income: number;
    expenses: number;
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
    const [pieData, setPieData] = useState<CategoryTotal[]>([]);
    const [monthlyTrend, setMonthlyTrend] = useState<MonthlyData[]>([]);
    const [transactionCount, setTransactionCount] = useState({ income: 0, expenses: 0 });
    const [selectedAccount, setSelectedAccount] = useState('All Accounts');

    useFocusEffect(
        React.useCallback(() => {
            loadReportData();
        }, [period, selectedDate, selectedAccount, theme]) // Re-run when theme changes
    );

    const chartConfig = {
        backgroundGradientFrom: 'transparent',
        backgroundGradientTo: 'transparent',
        backgroundGradientFromOpacity: 0,
        backgroundGradientToOpacity: 0,
        color: (opacity = 1) => isDark ? `rgba(255, 255, 255, ${opacity})` : `rgba(0, 0, 0, ${opacity})`,
        strokeWidth: 2,
        barPercentage: 0.5,
        useShadowColorFromDataset: false,
        labelColor: (opacity = 1) => isDark ? `rgba(255, 255, 255, ${opacity})` : `rgba(0, 0, 0, ${opacity})`,
    };

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
        const expensesByCategory: { [key: string]: number } = {};

        transactions.filter(t => t.type === 'expense').forEach(t => {
            const category = t.category || 'Uncategorized';
            expensesByCategory[category] = (expensesByCategory[category] || 0) + t.amount;
        });

        const colors = [
            '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40',
            '#E7E9ED', '#71B37C', '#EC932F', '#5D6D7E'
        ];

        const data: CategoryTotal[] = Object.entries(expensesByCategory)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 8)
            .map(([category, total], index) => ({
                name: category, // PieChart expects 'name' for legend? No, it uses accessor options, but usually structured with name/population. 
                // Actually react-native-chart-kit PieChart format:
                // name: string, population: number, color: string, legendFontColor: string, legendFontSize: number
                category, // Keeping for key
                total,
                population: total, // Using population for the value
                color: colors[index % colors.length],
                legendFontColor: theme.colors.textSecondary,
                legendFontSize: 12
            }));

        setPieData(data);
    };

    const calculateMonthlyTrend = (transactions: Transaction[]) => {
        const monthlyData: { [key: string]: { income: number; expenses: number } } = {};

        // Initialize last 6 months
        for (let i = 5; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            monthlyData[key] = { income: 0, expenses: 0 };
        }

        transactions.forEach(t => {
            const date = new Date(t.date);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            if (monthlyData[monthKey]) {
                if (t.type === 'income') monthlyData[monthKey].income += t.amount;
                else monthlyData[monthKey].expenses += t.amount;
            }
        });

        setMonthlyTrend(Object.entries(monthlyData)
            .map(([month, data]) => ({
                month: new Date(month + '-01').toLocaleDateString('default', { month: 'short' }),
                income: data.income,
                expenses: data.expenses,
            }))
            .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime()) // Roughly sort by month name if locale matches, but object entries order usually preserved for recent insertion order. Better to trust the init loop order.
        );
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

                {/* Pie Chart / Top Categories */}
                {pieData.length > 0 && (
                    <GlassCard style={styles.sectionCard}>
                        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Expense Breakdown</Text>
                        <PieChart
                            data={pieData}
                            width={width - 64} // Card padding applied
                            height={220}
                            chartConfig={chartConfig}
                            accessor={"population"}
                            backgroundColor={"transparent"}
                            paddingLeft={"15"}
                            center={[10, 0]}
                            absolute
                        />
                    </GlassCard>
                )}

                {/* Monthly Trend (Line Chart) */}
                {period === 'year' && monthlyTrend.length > 0 && (
                    <GlassCard style={styles.sectionCard}>
                        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Income vs Expenses</Text>
                        <LineChart
                            data={{
                                labels: monthlyTrend.map(d => d.month),
                                datasets: [
                                    {
                                        data: monthlyTrend.map(d => d.income),
                                        color: (opacity = 1) => theme.colors.success,
                                        strokeWidth: 2
                                    },
                                    {
                                        data: monthlyTrend.map(d => d.expenses),
                                        color: (opacity = 1) => theme.colors.error,
                                        strokeWidth: 2
                                    }
                                ],
                                legend: ["Income", "Expenses"]
                            }}
                            width={width - 64} // Card padding
                            height={220}
                            chartConfig={chartConfig}
                            bezier
                            style={{
                                marginVertical: 8,
                                borderRadius: 16
                            }}
                        />
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
        alignItems: 'center'
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 16,
        alignSelf: 'flex-start'
    },
});
