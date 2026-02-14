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

import { transactionService, Transaction } from '../../services/transaction.service';
import { subscriptionService } from '../../services/subscription.service';
import { debtService } from '../../services/debt.service';
import { investmentService } from '../../services/investment.service';

const screenWidth = Dimensions.get('window').width;

export const DashboardScreen = () => {
    const navigation = useNavigation();
    const { theme, isDark } = useTheme();
    const { isAmountHidden, toggleAmountVisibility } = usePrivacy();

    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [balance, setBalance] = useState(0);
    const [totalIncome, setTotalIncome] = useState(0);
    const [totalExpense, setTotalExpense] = useState(0);
    const [refreshing, setRefreshing] = useState(false);

    const [netWorth, setNetWorth] = useState(0);
    const [fixedMonthlyCost, setFixedMonthlyCost] = useState(0);
    const [investedAmount, setInvestedAmount] = useState(0);
    const [debtAmount, setDebtAmount] = useState(0);

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

        } catch (error) {
            console.error('Failed to load dashboard data', error);
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
        return `₹${amount.toLocaleString('en-IN')}`;
    };

    // Chart Data Preparation
    const categoryData = transactions
        .filter(t => t.type === 'expense')
        .reduce((acc, t) => {
            acc[t.category] = (acc[t.category] || 0) + t.amount;
            return acc;
        }, {} as Record<string, number>);

    const chartData = Object.keys(categoryData).map((category, index) => ({
        name: category,
        population: categoryData[category],
        color: index % 2 === 0 ? theme.colors.primary : theme.colors.secondary,
        legendFontColor: theme.colors.textSecondary,
        legendFontSize: 12,
    }));

    if (chartData.length === 0) {
        chartData.push({
            name: 'No Data',
            population: 100,
            color: theme.colors.border,
            legendFontColor: theme.colors.textSecondary,
            legendFontSize: 12,
        });
    }

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
                    <Text style={[styles.netWorthValue, { color: isDark ? theme.colors.primary : theme.colors.text }]}>
                        {formatCurrency(netWorth)}
                    </Text>
                </View>

                {/* Giant Pie Chart Centerpiece */}
                <View style={styles.chartContainer}>
                    <PieChart
                        data={chartData}
                        width={screenWidth}
                        height={240}
                        chartConfig={{
                            color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                        }}
                        accessor={"population"}
                        backgroundColor={"transparent"}
                        paddingLeft={"15"}
                        center={[10, 0]}
                        absolute
                        hasLegend={true}
                    />
                </View>

                {/* Income / Expense Summary Row */}
                <View style={styles.summaryRow}>
                    <GlassCard style={styles.summaryCard}>
                        <View style={styles.summaryContent}>
                            <Ionicons name="arrow-down-circle" size={24} color={theme.colors.success} />
                            <View>
                                <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>Income</Text>
                                <Text style={[styles.summaryValue, { color: theme.colors.text }]}>{formatCurrency(totalIncome)}</Text>
                            </View>
                        </View>
                    </GlassCard>
                    <View style={{ width: 10 }} />
                    <GlassCard style={styles.summaryCard}>
                        <View style={styles.summaryContent}>
                            <Ionicons name="arrow-up-circle" size={24} color={theme.colors.error} />
                            <View>
                                <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>Expense</Text>
                                <Text style={[styles.summaryValue, { color: theme.colors.text }]}>{formatCurrency(totalExpense)}</Text>
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
                    <GlassCard style={styles.gridItem}>
                        <Ionicons name="cash-outline" size={24} color={theme.colors.info} />
                        <Text style={[styles.gridLabel, { color: theme.colors.textSecondary }]}>Cash Balance</Text>
                        <Text style={[styles.gridValue, { color: theme.colors.text }]}>{formatCurrency(balance)}</Text>
                    </GlassCard>

                    <GlassCard style={styles.gridItem}>
                        <Ionicons name="trending-up" size={24} color={theme.colors.primary} />
                        <Text style={[styles.gridLabel, { color: theme.colors.textSecondary }]}>Invested</Text>
                        <Text style={[styles.gridValue, { color: theme.colors.text }]}>{formatCurrency(investedAmount)}</Text>
                    </GlassCard>

                    <GlassCard style={styles.gridItem}>
                        <Ionicons name="trending-down" size={24} color={theme.colors.error} />
                        <Text style={[styles.gridLabel, { color: theme.colors.textSecondary }]}>Debt</Text>
                        <Text style={[styles.gridValue, { color: theme.colors.text }]}>{formatCurrency(debtAmount)}</Text>
                    </GlassCard>

                    <GlassCard style={styles.gridItem}>
                        <Ionicons name="calendar-outline" size={24} color={theme.colors.warning} />
                        <Text style={[styles.gridLabel, { color: theme.colors.textSecondary }]}>Fixed/Mo</Text>
                        <Text style={[styles.gridValue, { color: theme.colors.text }]}>{formatCurrency(fixedMonthlyCost)}</Text>
                    </GlassCard>
                </View>

                {/* Recent Activity (Mini List) */}
                <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Recent Activity</Text>
                    <TouchableOpacity onPress={() => navigation.navigate('Expenses', { screen: 'ExpensesList' })}>
                        <Text style={[styles.seeAllText, { color: theme.colors.primary }]}>View All</Text>
                    </TouchableOpacity>
                </View>

                {transactions.slice(0, 5).map((t) => (
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
                ))}

            </ScrollView>

            {/* Floating Action Button for Quick Add */}
            <TouchableOpacity
                style={[styles.fab, { backgroundColor: theme.colors.primary, shadowColor: theme.colors.primary }]}
                onPress={() => {
                    // TODO: Expand or show Action Sheet for Income/Expense
                    // For now, default to Expense as per old behavior, but user can navigate back
                    navigation.navigate('Expenses', { screen: 'AddTransaction' });
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
        fontSize: 48, // Giant Text
        fontWeight: 'bold',
        marginTop: 5,
        textShadowColor: 'rgba(0,0,0,0.2)',
        textShadowOffset: { width: 0, height: 4 },
        textShadowRadius: 10,
    },
    netWorthRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    chartContainer: {
        alignItems: 'center',
        marginBottom: 30,
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
        fontSize: 20,
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
        bottom: 110,
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
