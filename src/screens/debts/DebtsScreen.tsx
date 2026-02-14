import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { debtService, Debt } from '../../services/debt.service';
import { AmountDisplay } from '../../components/AmountDisplay';
import { useTheme } from '../../contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GlassHeader } from '../../components/GlassHeader';

export const DebtsScreen = () => {
    const navigation = useNavigation();
    const { theme } = useTheme();
    const [debts, setDebts] = useState<Debt[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [totalRemaining, setTotalRemaining] = useState(0);
    const insets = useSafeAreaInsets();

    const loadData = async () => {
        try {
            const data = await debtService.getAllDebts();
            setDebts(data);
            setTotalRemaining(data.reduce((sum, d) => sum + d.remaining_amount, 0));
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

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <GlassHeader
                title="Debts"
                showBack
                onBack={() => navigation.goBack()}
            />
            <ScrollView
                style={styles.list}
                contentContainerStyle={{ paddingTop: 100, paddingBottom: 100 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
            >
                <View style={[styles.summaryCard, { backgroundColor: theme.colors.error }]}>
                    <Text style={styles.summaryLabel}>Total Outstanding Debt</Text>
                    <AmountDisplay amount={totalRemaining} size="large" style={styles.summaryAmount} />
                    <Text style={styles.summarySubtext}>{debts.length} active loans</Text>
                </View>

                {debts.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="documents-outline" size={48} color={theme.colors.textSecondary} />
                        <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>No debts recorded</Text>
                        <Text style={[styles.emptySubtext, { color: theme.colors.textSecondary }]}>Track money you owe here</Text>
                    </View>
                ) : (
                    debts.map((debt) => {
                        const progress = debt.principal_amount > 0
                            ? ((debt.principal_amount - debt.remaining_amount) / debt.principal_amount) * 100
                            : 0;

                        return (
                            <TouchableOpacity
                                key={debt.id}
                                style={[styles.card, { backgroundColor: theme.colors.card }]}
                                onPress={() => navigation.navigate('DebtDetails', { debt } as any)}
                            >
                                <View style={styles.cardHeader}>
                                    <View style={styles.cardInfo}>
                                        <Text style={[styles.name, { color: theme.colors.text }]}>{debt.name}</Text>
                                        <Text style={[styles.creditor, { color: theme.colors.textSecondary }]}>{debt.creditor || 'Unknown Creditor'}</Text>
                                    </View>
                                    <View style={{ alignItems: 'flex-end' }}>
                                        <AmountDisplay amount={debt.remaining_amount} size="medium" />
                                        <Text style={[styles.totalLabel, { color: theme.colors.textSecondary }]}>
                                            of <AmountDisplay amount={debt.principal_amount} size="small" style={{ fontSize: 12, color: theme.colors.textSecondary }} />
                                        </Text>
                                    </View>
                                </View>

                                <View style={[styles.progressBarBg, { backgroundColor: theme.colors.border }]}>
                                    <View style={[styles.progressBarFill, { width: `${progress}%`, backgroundColor: theme.colors.success }]} />
                                </View>
                                <Text style={[styles.progressText, { color: theme.colors.textSecondary }]}>{progress.toFixed(0)}% paid</Text>
                            </TouchableOpacity>
                        );
                    })
                )}
                <View style={{ height: 100 }} />
            </ScrollView>

            <TouchableOpacity
                style={[styles.fab, { backgroundColor: theme.colors.error }]}
                onPress={() => navigation.navigate('AddDebt' as never)}
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
        alignItems: 'center',
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
        marginBottom: 10,
    },
    summaryLabel: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 14,
        marginBottom: 8,
    },
    summaryAmount: {
        color: '#fff',
    },
    summarySubtext: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 12,
        marginTop: 8,
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
        marginBottom: 12,
    },
    cardInfo: {
        flex: 1,
    },
    name: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    creditor: {
        fontSize: 12,
    },
    totalLabel: {
        fontSize: 12,
    },
    progressBarBg: {
        height: 6,
        borderRadius: 3,
        overflow: 'hidden',
        marginBottom: 4,
    },
    progressBarFill: {
        height: '100%',
    },
    progressText: {
        fontSize: 10,
        textAlign: 'right',
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
