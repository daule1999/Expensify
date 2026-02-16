import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { GlassCard } from '../../components/GlassCard';
import { budgetService, BudgetWithSpending } from '../../services/budget.service';
import { useTheme } from '../../contexts/ThemeContext';

export const BudgetScreen = () => {
    const navigation = useNavigation();
    const { theme } = useTheme();
    const [budgets, setBudgets] = useState<BudgetWithSpending[]>([]);
    const [refreshing, setRefreshing] = useState(false);

    const loadBudgets = async () => {
        const data = await budgetService.getBudgetsWithSpending();
        setBudgets(data);
    };

    useFocusEffect(
        useCallback(() => {
            loadBudgets();
        }, [])
    );

    const onRefresh = async () => {
        setRefreshing(true);
        await loadBudgets();
        setRefreshing(false);
    };

    const handleDelete = (id: string, category: string) => {
        Alert.alert(
            'Remove Budget',
            `Remove the budget for "${category}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: async () => {
                        await budgetService.delete(id);
                        await loadBudgets();
                    },
                },
            ]
        );
    };

    const getStatusColor = (percentage: number) => {
        if (percentage >= 90) return '#FF4444';
        if (percentage >= 70) return '#FF9800';
        if (percentage >= 50) return '#FFC107';
        return theme.colors.success;
    };

    const getStatusLabel = (percentage: number) => {
        if (percentage >= 100) return 'Over Budget!';
        if (percentage >= 90) return 'Critical';
        if (percentage >= 70) return 'Warning';
        return 'On Track';
    };

    const formatCurrency = (amount: number) => {
        if (Math.abs(amount) >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
        if (Math.abs(amount) >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
        if (Math.abs(amount) >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
        return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
    };

    const totalBudget = budgets.reduce((sum, b) => sum + b.amount, 0);
    const totalSpent = budgets.reduce((sum, b) => sum + b.spent, 0);
    const overallPercentage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            {/* Header */}
            <LinearGradient
                colors={[theme.colors.primary, theme.colors.secondary]}
                style={styles.header}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                <View style={styles.headerRow}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={24} color="#FFF" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Budgets</Text>
                    <TouchableOpacity onPress={() => (navigation as any).navigate('AddBudget')} style={styles.addBtn}>
                        <Ionicons name="add-circle" size={28} color="#FFF" />
                    </TouchableOpacity>
                </View>

                {/* Overview Card */}
                <View style={styles.overviewCard}>
                    <View style={styles.overviewRow}>
                        <View>
                            <Text style={styles.overviewLabel}>Total Budget</Text>
                            <Text style={styles.overviewAmount}>{formatCurrency(totalBudget)}</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                            <Text style={styles.overviewLabel}>Spent</Text>
                            <Text style={[styles.overviewAmount, { color: getStatusColor(overallPercentage) }]}>
                                {formatCurrency(totalSpent)}
                            </Text>
                        </View>
                    </View>

                    {/* Overall Progress Bar */}
                    <View style={styles.progressBarBg}>
                        <View
                            style={[
                                styles.progressBarFill,
                                {
                                    width: `${Math.min(100, overallPercentage)}%`,
                                    backgroundColor: getStatusColor(overallPercentage),
                                },
                            ]}
                        />
                    </View>
                    <Text style={styles.overviewPercent}>{overallPercentage.toFixed(0)}% used</Text>
                </View>
            </LinearGradient>

            {/* Budget List */}
            <ScrollView
                style={styles.list}
                contentContainerStyle={{ paddingBottom: 100 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {budgets.length === 0 ? (
                    <GlassCard style={styles.emptyCard}>
                        <Ionicons name="wallet-outline" size={48} color={theme.colors.textSecondary} />
                        <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>No Budgets Yet</Text>
                        <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
                            Tap + to set spending limits for your categories
                        </Text>
                    </GlassCard>
                ) : (
                    budgets.map((budget) => {
                        const statusColor = getStatusColor(budget.percentage);
                        return (
                            <GlassCard key={budget.id} style={styles.budgetCard}>
                                <TouchableOpacity
                                    style={styles.deleteBtn}
                                    onPress={() => handleDelete(budget.id, budget.category)}
                                >
                                    <Ionicons name="close-circle" size={20} color={theme.colors.textSecondary} />
                                </TouchableOpacity>

                                <View style={styles.budgetHeader}>
                                    <View style={[styles.categoryDot, { backgroundColor: statusColor }]} />
                                    <Text style={[styles.categoryName, { color: theme.colors.text }]}>
                                        {budget.category}
                                    </Text>
                                    <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
                                        <Text style={[styles.statusText, { color: statusColor }]}>
                                            {getStatusLabel(budget.percentage)}
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.amountRow}>
                                    <Text style={[styles.spentAmount, { color: theme.colors.text }]}>
                                        {formatCurrency(budget.spent)}
                                    </Text>
                                    <Text style={[styles.budgetAmount, { color: theme.colors.textSecondary }]}>
                                        / {formatCurrency(budget.amount)}
                                    </Text>
                                </View>

                                <View style={[styles.progressBarBgSmall, { backgroundColor: theme.colors.surface }]}>
                                    <View
                                        style={[
                                            styles.progressBarFillSmall,
                                            {
                                                width: `${Math.min(100, budget.percentage)}%`,
                                                backgroundColor: statusColor,
                                            },
                                        ]}
                                    />
                                </View>

                                <View style={styles.budgetFooter}>
                                    <Text style={[styles.periodLabel, { color: theme.colors.textSecondary }]}>
                                        {budget.period.charAt(0).toUpperCase() + budget.period.slice(1)}
                                    </Text>
                                    <Text style={[styles.remainingText, { color: theme.colors.textSecondary }]}>
                                        ₹{budget.remaining.toLocaleString('en-IN', { maximumFractionDigits: 0 })} left
                                    </Text>
                                </View>
                            </GlassCard>
                        );
                    })
                )}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { paddingTop: 50, paddingBottom: 24, paddingHorizontal: 20 },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
    backBtn: { padding: 4 },
    addBtn: { padding: 4 },
    headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#FFF' },
    overviewCard: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 16, padding: 16 },
    overviewRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
    overviewLabel: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 4 },
    overviewAmount: { fontSize: 22, fontWeight: 'bold', color: '#FFF' },
    overviewPercent: { fontSize: 12, color: 'rgba(255,255,255,0.8)', textAlign: 'right', marginTop: 6 },
    progressBarBg: { height: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 4, overflow: 'hidden' },
    progressBarFill: { height: '100%', borderRadius: 4 },
    list: { flex: 1, paddingHorizontal: 16, marginTop: 12 },
    emptyCard: { alignItems: 'center', padding: 40, marginTop: 40 },
    emptyTitle: { fontSize: 18, fontWeight: '600', marginTop: 16 },
    emptySubtitle: { fontSize: 14, marginTop: 8, textAlign: 'center' },
    budgetCard: { marginBottom: 12, padding: 16, position: 'relative' },
    deleteBtn: { position: 'absolute', top: 12, right: 12, zIndex: 1 },
    budgetHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    categoryDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
    categoryName: { fontSize: 16, fontWeight: '600', flex: 1 },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
    statusText: { fontSize: 11, fontWeight: '600' },
    amountRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 8 },
    spentAmount: { fontSize: 20, fontWeight: 'bold' },
    budgetAmount: { fontSize: 14, marginLeft: 4 },
    progressBarBgSmall: { height: 6, borderRadius: 3, overflow: 'hidden', marginBottom: 8 },
    progressBarFillSmall: { height: '100%', borderRadius: 3 },
    budgetFooter: { flexDirection: 'row', justifyContent: 'space-between' },
    periodLabel: { fontSize: 12 },
    remainingText: { fontSize: 12 },
});
