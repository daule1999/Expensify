import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Dimensions, TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { PieChart } from 'react-native-chart-kit';

import { useTheme } from '../../contexts/ThemeContext';
import { usePrivacy } from '../../contexts/PrivacyContext';
import { GlassCard } from '../../components/GlassCard';
import { Skeleton } from '../../components/Skeleton';

import { transactionService, Transaction } from '../../services/transaction.service';
import { subscriptionService } from '../../services/subscription.service';
import { debtService } from '../../services/debt.service';
import { investmentService } from '../../services/investment.service';
import { insightsService, InsightsSummary } from '../../services/insights.service';
import { settingsService } from '../../services/settings.service';

const screenWidth = Dimensions.get('window').width;

export const DashboardScreen = () => {
    const navigation = useNavigation();
    const { theme, isDark } = useTheme();
    const { isAmountHidden, toggleAmountVisibility } = usePrivacy();

    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [balance, setBalance] = useState(0);
    const [totalIncome, setTotalIncome] = useState(0);
    const [totalExpense, setTotalExpense] = useState(0);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const [netWorth, setNetWorth] = useState(0);
    const [fixedMonthlyCost, setFixedMonthlyCost] = useState(0);
    const [investedAmount, setInvestedAmount] = useState(0);
    const [debtAmount, setDebtAmount] = useState(0);
    const [currency, setCurrency] = useState('₹');
    const [insights, setInsights] = useState<InsightsSummary | null>(null);

    const loadData = async () => {
        try {
            // Load transactions
            const txs = await transactionService.getAll();
            setTransactions(txs);

            const tIncome = txs
                .filter(t => t.type === 'income')
                .reduce((sum, t) => sum + t.amount, 0);

            const tExpense = txs
                .filter(t => t.type === 'expense')
                .reduce((sum, t) => sum + t.amount, 0);

            setTotalIncome(tIncome);
            setTotalExpense(tExpense);
            setBalance(tIncome - tExpense);

            // Load Subscriptions (Monthly Cost)
            const subs = await subscriptionService.getAll();
            const monthlySubsCost = subscriptionService.calculateMonthlyTotal(subs);

            // Load Debts
            const debts = await debtService.getAllDebts();
            const totalDebt = debts.reduce((sum, d) => sum + d.remaining_amount, 0);
            const monthlyDebtCost = debts.reduce((sum, d) => sum + (d.emi_amount || 0), 0);
            setDebtAmount(totalDebt);

            // Load Investments
            const investments = await investmentService.getAllInvestments();
            const totalInvested = investments.reduce((sum, i) => sum + i.amount_invested, 0);
            setInvestedAmount(totalInvested);

            // Calculate Net Worth
            setNetWorth((tIncome - tExpense) + totalInvested - totalDebt);
            setFixedMonthlyCost(monthlySubsCost + monthlyDebtCost);

            // Load currency setting
            const profile = await settingsService.getProfileSettings();
            setCurrency(profile.currency || '₹');

            // Load insights
            const insightData = await insightsService.getSummary();
            setInsights(insightData);

        } catch (error) {
            console.error('Failed to load dashboard data', error);
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    }, []);

    const formatCurrency = (amount: number) => {
        if (isAmountHidden) return '****';
        return `${currency}${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
    };

    const formatCompact = (amount: number) => {
        if (isAmountHidden) return '****';
        if (Math.abs(amount) >= 10000000) return `${currency}${(amount / 10000000).toFixed(2)}Cr`;
        if (Math.abs(amount) >= 100000) return `${currency}${(amount / 100000).toFixed(2)}L`;
        if (Math.abs(amount) >= 1000) return `${currency}${(amount / 1000).toFixed(1)}K`;
        return `${currency}${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
    };

    // Chart Data Preparation
    const categoryData = transactions
        .filter(t => t.type === 'expense')
        .reduce((acc, t) => {
            const cat = t.category || 'Uncategorized';
            acc[cat] = (acc[cat] || 0) + t.amount;
            return acc;
        }, {} as Record<string, number>);

    const chartData = Object.keys(categoryData).map((category, index) => ({
        name: category,
        population: categoryData[category],
        color: index % 2 === 0 ? theme.colors.primary : theme.colors.secondary,
        legendFontColor: theme.colors.textSecondary,
        legendFontSize: 12,
    }));

    const hasChartData = chartData.length > 0 && chartData.some(d => d.population > 0);

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <LinearGradient
                colors={isDark ? ['#1A0033', '#000000'] : ['#E0EAFC', '#CFDEF3']}
                style={StyleSheet.absoluteFill}
            />

            <ScrollView
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
                }
                contentContainerStyle={styles.scrollContent}
            >
                {/* Header */}
                <View style={styles.header}>
                    <Text style={[styles.greeting, { color: theme.colors.textSecondary }]}>Financial Overview</Text>
                    <View style={styles.netWorthRow}>
                        <Text style={[styles.netWorthTitle, { color: theme.colors.text }]}>Net Worth</Text>
                        <TouchableOpacity onPress={toggleAmountVisibility} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                            <Ionicons
                                name={isAmountHidden ? "eye-off-outline" : "eye-outline"}
                                size={22}
                                color={theme.colors.textSecondary}
                                style={{ marginTop: 5 }}
                            />
                        </TouchableOpacity>
                    </View>
                    <Text
                        style={[styles.netWorthValue, { color: isDark ? theme.colors.primary : theme.colors.text }]}
                        adjustsFontSizeToFit
                        numberOfLines={1}
                    >
                        {loading ? <Skeleton width={150} height={40} /> : formatCurrency(netWorth)}
                    </Text>
                </View>

                {/* Search FAB - top right */}
                <TouchableOpacity
                    style={{ position: 'absolute', right: 20, top: 50 }}
                    onPress={() => navigation.navigate('TransactionSearch' as never)}
                >
                    <Ionicons name="search-outline" size={24} color={theme.colors.textSecondary} />
                </TouchableOpacity>

                {/* Giant Pie Chart Centerpiece */}
                {(loading || hasChartData) && (
                    <View style={styles.chartContainer}>
                        {loading ? (
                            <Skeleton width={screenWidth - 40} height={200} borderRadius={100} />
                        ) : (
                            <PieChart
                                data={chartData}
                                width={screenWidth - 40}
                                height={200}
                                chartConfig={{
                                    color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                                }}
                                accessor={"population"}
                                backgroundColor={"transparent"}
                                paddingLeft={"0"}
                                center={[0, 0]}
                                absolute
                                hasLegend={false}
                            />
                        )}
                        {/* Custom Legend */}
                        <View style={styles.legendContainer}>
                            {loading ? (
                                [1, 2, 3].map(i => <Skeleton key={i} width={80} height={15} style={{ marginRight: 10, marginBottom: 10 }} />)
                            ) : (
                                chartData.map((item, index) => (
                                    <View key={index} style={styles.legendItem}>
                                        <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                                        <Text style={[styles.legendText, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                                            {formatCompact(item.population)} {item.name}
                                        </Text>
                                    </View>
                                ))
                            )}
                        </View>
                    </View>
                )}

                {/* Income / Expense Summary Row */}
                <View style={styles.summaryRow}>
                    <GlassCard style={styles.summaryCard}>
                        <View style={styles.summaryContent}>
                            <Ionicons name="arrow-down-circle" size={24} color={theme.colors.success} />
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>Income</Text>
                                {loading ? <Skeleton width={60} height={20} /> : <Text style={[styles.summaryValue, { color: theme.colors.text }]} numberOfLines={1} adjustsFontSizeToFit>{formatCompact(totalIncome)}</Text>}
                            </View>
                        </View>
                    </GlassCard>
                    <View style={{ width: 10 }} />
                    <GlassCard style={styles.summaryCard}>
                        <View style={styles.summaryContent}>
                            <Ionicons name="arrow-up-circle" size={24} color={theme.colors.error} />
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>Expense</Text>
                                {loading ? <Skeleton width={60} height={20} /> : <Text style={[styles.summaryValue, { color: theme.colors.text }]} numberOfLines={1} adjustsFontSizeToFit>{formatCompact(totalExpense)}</Text>}
                            </View>
                        </View>
                    </GlassCard>
                </View>

                {/* Quick Access Grid */}
                <View style={styles.grid}>
                    <TouchableOpacity style={styles.moduleCard} onPress={() => navigation.navigate('Subscriptions' as never)}>
                        <LinearGradient colors={['#FF9A9E', '#FECFEF']} style={styles.moduleIcon}>
                            <Ionicons name="calendar" size={24} color="#FFF" />
                        </LinearGradient>
                        <Text style={[styles.moduleText, { color: theme.colors.text }]}>Subscriptions</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.moduleCard} onPress={() => navigation.navigate('Debts' as never)}>
                        <LinearGradient colors={['#a18cd1', '#fbc2eb']} style={styles.moduleIcon}>
                            <Ionicons name="card" size={24} color="#FFF" />
                        </LinearGradient>
                        <Text style={[styles.moduleText, { color: theme.colors.text }]}>Debts</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.moduleCard} onPress={() => navigation.navigate('Investments' as never)}>
                        <LinearGradient colors={['#84fab0', '#8fd3f4']} style={styles.moduleIcon}>
                            <Ionicons name="trending-up" size={24} color="#FFF" />
                        </LinearGradient>
                        <Text style={[styles.moduleText, { color: theme.colors.text }]}>Investments</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.moduleCard} onPress={() => navigation.navigate('Assets' as never)}>
                        <LinearGradient colors={['#fccb90', '#d57eeb']} style={styles.moduleIcon}>
                            <Ionicons name="home" size={24} color="#FFF" />
                        </LinearGradient>
                        <Text style={[styles.moduleText, { color: theme.colors.text }]}>Assets</Text>
                    </TouchableOpacity>
                </View>

                {/* Financial Summary Grid */}
                <View style={styles.grid}>
                    {[
                        { icon: 'cash-outline', color: theme.colors.info, label: 'Cash Balance', value: balance },
                        { icon: 'trending-up', color: theme.colors.primary, label: 'Invested', value: investedAmount },
                        { icon: 'trending-down', color: theme.colors.error, label: 'Debt', value: debtAmount },
                        { icon: 'calendar-outline', color: theme.colors.warning, label: 'Fixed/Mo', value: fixedMonthlyCost },
                    ].map((item, idx) => (
                        <GlassCard key={idx} style={styles.gridItem}>
                            <Ionicons name={item.icon as any} size={24} color={item.color} />
                            <Text style={[styles.gridLabel, { color: theme.colors.textSecondary }]}>{item.label}</Text>
                            {loading ? <Skeleton width={80} height={18} style={{ marginTop: 4 }} /> : <Text style={[styles.gridValue, { color: theme.colors.text }]}>{formatCurrency(item.value)}</Text>}
                        </GlassCard>
                    ))}
                </View>

                {/* Recent Activity (Mini List) */}
                <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Recent Activity</Text>
                    <TouchableOpacity onPress={() => (navigation as any).navigate('Expenses', { screen: 'ExpensesList' })}>
                        <Text style={[styles.seeAllText, { color: theme.colors.primary }]}>View All</Text>
                    </TouchableOpacity>
                </View>

                {loading ? (
                    [1, 2, 3].map(i => <Skeleton key={i} height={70} style={{ marginBottom: 10 }} />)
                ) : (
                    transactions.slice(0, 5).map((t) => (
                        <GlassCard key={t.id} style={styles.transactionItem}>
                            <View style={styles.transactionRow}>
                                <View>
                                    <Text style={[styles.tTitle, { color: theme.colors.text }]}>{t.category}</Text>
                                    <Text style={[styles.tDate, { color: theme.colors.textSecondary }]}>{new Date(t.date).toLocaleDateString()}</Text>
                                </View>
                                <Text style={[
                                    styles.tAmount,
                                    { color: t.type === 'income' ? theme.colors.success : theme.colors.error }
                                ]}>
                                    {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                                </Text>
                            </View>
                        </GlassCard>
                    ))
                )}

                {/* Spending Insights Card */}
                {!loading && insights && (
                    <>
                        <View style={styles.sectionHeader}>
                            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Spending Insights</Text>
                        </View>
                        <GlassCard style={{ padding: 16, marginBottom: 20 }}>
                            {/* Monthly Comparison */}
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
                                <Ionicons
                                    name={insights.monthlyComparison.direction === 'up' ? 'trending-up' : insights.monthlyComparison.direction === 'down' ? 'trending-down' : 'remove-outline'}
                                    size={28}
                                    color={insights.monthlyComparison.direction === 'up' ? theme.colors.error : insights.monthlyComparison.direction === 'down' ? theme.colors.success : theme.colors.textSecondary}
                                />
                                <View style={{ marginLeft: 12, flex: 1 }}>
                                    <Text style={{ color: theme.colors.text, fontWeight: '600', fontSize: 15 }}>
                                        {insights.monthlyComparison.direction === 'up' ? 'Spending Up' : insights.monthlyComparison.direction === 'down' ? 'Spending Down' : 'No Change'} {insights.monthlyComparison.percentChange}%
                                    </Text>
                                    <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
                                        vs last month ({formatCompact(insights.monthlyComparison.lastMonth)})
                                    </Text>
                                </View>
                                <Text style={{ color: theme.colors.text, fontWeight: 'bold', fontSize: 16 }}>
                                    {formatCompact(insights.monthlyComparison.currentMonth)}
                                </Text>
                            </View>

                            {/* Divider */}
                            <View style={{ height: 1, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)', marginBottom: 14 }} />

                            {/* Stats Row */}
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                <View style={{ alignItems: 'center', flex: 1 }}>
                                    <Ionicons name="today-outline" size={20} color={theme.colors.primary} />
                                    <Text style={{ color: theme.colors.text, fontWeight: '600', marginTop: 4 }}>{formatCompact(insights.dailyAverage)}</Text>
                                    <Text style={{ color: theme.colors.textSecondary, fontSize: 11 }}>Daily Avg</Text>
                                </View>
                                <View style={{ alignItems: 'center', flex: 1 }}>
                                    <Ionicons name="leaf-outline" size={20} color={theme.colors.success} />
                                    <Text style={{ color: theme.colors.text, fontWeight: '600', marginTop: 4 }}>{insights.noSpendDays}/{insights.totalDaysInMonth}</Text>
                                    <Text style={{ color: theme.colors.textSecondary, fontSize: 11 }}>No-Spend Days</Text>
                                </View>
                                <View style={{ alignItems: 'center', flex: 1 }}>
                                    <Ionicons name="podium-outline" size={20} color={theme.colors.warning} />
                                    <Text style={{ color: theme.colors.text, fontWeight: '600', marginTop: 4 }}>{insights.topCategories[0]?.category || '—'}</Text>
                                    <Text style={{ color: theme.colors.textSecondary, fontSize: 11 }}>Top Category</Text>
                                </View>
                            </View>

                            {/* Top Categories Breakdown */}
                            {insights.topCategories.length > 1 && (
                                <View style={{ marginTop: 14 }}>
                                    {insights.topCategories.slice(0, 3).map((cat, idx) => (
                                        <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                                            <View style={{ flex: 1 }}>
                                                <Text style={{ color: theme.colors.text, fontSize: 13 }}>{cat.category}</Text>
                                            </View>
                                            <View style={{ flex: 2, height: 6, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)', borderRadius: 3, marginHorizontal: 8 }}>
                                                <View style={{ width: `${cat.percentage}%`, height: '100%', backgroundColor: theme.colors.primary, borderRadius: 3 }} />
                                            </View>
                                            <Text style={{ color: theme.colors.textSecondary, fontSize: 12, width: 35, textAlign: 'right' }}>{cat.percentage}%</Text>
                                        </View>
                                    ))}
                                </View>
                            )}
                        </GlassCard>
                    </>
                )}

            </ScrollView>

            {/* Floating Action Button for Quick Add */}
            <TouchableOpacity
                style={[styles.fab, { backgroundColor: theme.colors.primary, shadowColor: theme.colors.primary }]}
                onPress={() => {
                    // TODO: Expand or show Action Sheet for Income/Expense
                    // For now, default to Expense as per old behavior, but user can navigate back
                    (navigation as any).navigate('Expenses', { screen: 'AddTransaction' });
                }}
                onLongPress={() => {
                    // Hidden feature: Long press to add Income? 
                    // Or just navigate to AddIncome if that screen exists?
                    // Verify if AddIncomeScreen exists and is registered.
                    // Assuming 'Income' stack exists or similar.
                    // Checks navigation structure...
                    // Ideally we should have a better UI for this.
                    // For now, let's keep simple.
                }}
            >
                <Ionicons name="add" size={32} color="#FFF" />
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 100,
    },
    header: {
        marginTop: 40,
        marginBottom: 20,
        alignItems: 'center',
    },
    greeting: {
        fontSize: 16,
        textTransform: 'uppercase',
        letterSpacing: 2,
    },
    netWorthTitle: {
        fontSize: 32,
        fontWeight: '200',
        marginTop: 5,
    },
    netWorthValue: {
        fontSize: 38,
        fontWeight: 'bold',
        marginTop: 5,
        textShadowColor: 'rgba(0,0,0,0.2)',
        textShadowOffset: { width: 0, height: 4 },
        textShadowRadius: 10,
        paddingHorizontal: 10,
    },
    netWorthRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    chartContainer: {
        alignItems: 'center',
        marginBottom: 20,
    },
    legendContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        marginTop: 10,
        paddingHorizontal: 10,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 16,
        marginBottom: 6,
    },
    legendDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginRight: 6,
    },
    legendText: {
        fontSize: 12,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    summaryCard: {
        flex: 1,
        padding: 15,
    },
    summaryContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around' // distribute space
    },
    summaryLabel: {
        fontSize: 12,
        marginLeft: 8,
    },
    summaryValue: {
        fontSize: 16,
        fontWeight: 'bold',
        marginLeft: 8,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: 30,
    },
    gridItem: {
        width: '48%',
        marginBottom: 15,
        alignItems: 'center',
    },
    gridLabel: {
        fontSize: 14,
        marginTop: 8,
    },
    gridValue: {
        fontSize: 16,
        fontWeight: 'bold',
        marginTop: 4,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
        paddingHorizontal: 5,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '600',
    },
    seeAllText: {
        fontSize: 14,
        fontWeight: '500',
    },
    transactionItem: {
        marginBottom: 10,
    },
    transactionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    tTitle: {
        fontSize: 16,
        fontWeight: '500',
    },
    tDate: {
        fontSize: 12,
        marginTop: 2,
    },
    tAmount: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    fab: {
        position: 'absolute',
        bottom: 90,
        right: 20,
        width: 60,
        height: 60,
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 10,
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
    },
    moduleCard: {
        width: '23%',
        alignItems: 'center',
        marginBottom: 10,
    },
    moduleIcon: {
        width: 50,
        height: 50,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    moduleText: {
        fontSize: 11,
        fontWeight: '600',
        textAlign: 'center',
    }
});
