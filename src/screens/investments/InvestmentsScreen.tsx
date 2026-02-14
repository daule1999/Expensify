import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { investmentService, Investment } from '../../services/investment.service';
import { AmountDisplay } from '../../components/AmountDisplay';
import { useTheme } from '../../contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GlassHeader } from '../../components/GlassHeader';

export const InvestmentsScreen = () => {
    const navigation = useNavigation();
    const { theme } = useTheme();
    const [investments, setInvestments] = useState<Investment[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [summary, setSummary] = useState({ totalInvested: 0, totalCurrent: 0, profitLoss: 0, percentage: 0 });
    const insets = useSafeAreaInsets();

    const loadData = async () => {
        try {
            const data = await investmentService.getAllInvestments();
            setInvestments(data);
            setSummary(investmentService.getPortfolioSummary(data));
        } catch (error) {
            console.error(error);
        } finally {
            setRefreshing(false);
        }
    };

    useFocusEffect(
        React.useCallback(() => {
            loadData();
        }, [])
    );

    const onRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    const handleDelete = (id: string) => {
        Alert.alert(
            'Delete Investment',
            'Are you sure you want to remove this investment?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        await investmentService.deleteInvestment(id);
                        loadData();
                    }
                }
            ]
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <GlassHeader
                title="Investments"
                showBack
                onBack={() => navigation.goBack()}
            />
            <ScrollView
                style={styles.list}
                contentContainerStyle={{ paddingTop: 100, paddingBottom: 100 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
            >
                <View style={[styles.summaryCard, { backgroundColor: theme.colors.success }]}>
                    <Text style={styles.summaryLabel}>Total Portfolio Value</Text>
                    <AmountDisplay amount={summary.totalCurrent} size="large" style={styles.summaryAmount} />

                    <View style={styles.summaryRow}>
                        <View style={styles.summaryItem}>
                            <Text style={styles.summarySubLabel}>Invested</Text>
                            <AmountDisplay amount={summary.totalInvested} size="small" style={styles.summarySubValue} />
                        </View>
                        <View style={styles.summaryItem}>
                            <Text style={styles.summarySubLabel}>Returns</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <AmountDisplay
                                    amount={summary.profitLoss}
                                    size="small"
                                    style={{ color: summary.profitLoss >= 0 ? '#4CAF50' : '#ffeb3b', fontWeight: 'bold' }}
                                />
                                <Text style={{
                                    color: summary.profitLoss >= 0 ? '#4CAF50' : '#ffeb3b',
                                    fontSize: 12,
                                    marginLeft: 4
                                }}>
                                    ({summary.percentage.toFixed(2)}%)
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>

                {investments.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="bar-chart-outline" size={48} color={theme.colors.textSecondary} />
                        <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>No investments yet</Text>
                        <Text style={[styles.emptySubtext, { color: theme.colors.textSecondary }]}>Start building your portfolio</Text>
                    </View>
                ) : (
                    investments.map((inv) => {
                        const isProfitable = inv.current_value >= inv.amount_invested;
                        const returnVal = inv.current_value - inv.amount_invested;
                        const returnPct = inv.amount_invested > 0 ? (returnVal / inv.amount_invested) * 100 : 0;

                        return (
                            <TouchableOpacity
                                key={inv.id}
                                style={[styles.card, { backgroundColor: theme.colors.card }]}
                                onLongPress={() => handleDelete(inv.id)}
                            >
                                <View style={styles.cardHeader}>
                                    <View>
                                        <Text style={[styles.name, { color: theme.colors.text }]}>{inv.name}</Text>
                                        <Text style={[
                                            styles.type,
                                            { color: theme.colors.textSecondary, backgroundColor: theme.colors.background }
                                        ]}>{inv.type}</Text>
                                    </View>
                                    <View style={{ alignItems: 'flex-end' }}>
                                        <AmountDisplay amount={inv.current_value} size="medium" />
                                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                                            <Ionicons
                                                name={isProfitable ? "caret-up" : "caret-down"}
                                                size={12}
                                                color={isProfitable ? theme.colors.success : theme.colors.error}
                                            />
                                            <Text style={{
                                                fontSize: 12,
                                                color: isProfitable ? theme.colors.success : theme.colors.error,
                                                marginLeft: 2
                                            }}>
                                                {Math.abs(returnPct).toFixed(1)}%
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        );
                    })
                )}
                <View style={{ height: 100 }} />
            </ScrollView>

            <TouchableOpacity
                style={[styles.fab, { backgroundColor: theme.colors.success }]}
                onPress={() => navigation.navigate('AddInvestment' as never)}
            >
                <Ionicons name="add" size={30} color="#fff" />
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    summaryCard: {
        padding: 20,
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
        marginBottom: 10,
    },
    summaryLabel: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 14,
        marginBottom: 8,
        textAlign: 'center',
    },
    summaryAmount: {
        color: '#fff',
        textAlign: 'center',
        marginBottom: 16,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(0,0,0,0.1)',
        padding: 12,
        borderRadius: 12,
    },
    summaryItem: {
        flex: 1,
        alignItems: 'center',
    },
    summarySubLabel: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 12,
        marginBottom: 4,
    },
    summarySubValue: {
        color: '#fff',
        fontSize: 16,
    },
    list: {
        flex: 1,
        padding: 16,
    },
    card: {
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    name: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    type: {
        fontSize: 12,
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
        overflow: 'hidden',
    },
    fab: {
        position: 'absolute',
        bottom: 24,
        right: 24,
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 60,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: 'bold',
        marginTop: 16,
    },
    emptySubtext: {
        fontSize: 14,
        marginTop: 8,
    },
});
