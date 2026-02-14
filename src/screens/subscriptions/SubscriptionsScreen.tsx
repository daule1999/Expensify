import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { subscriptionService, Subscription } from '../../services/subscription.service';
import { AmountDisplay } from '../../components/AmountDisplay';
import { useTheme } from '../../contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GlassHeader } from '../../components/GlassHeader';

export const SubscriptionsScreen = () => {
    const navigation = useNavigation();
    const { theme } = useTheme();
    const insets = useSafeAreaInsets();
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [monthlyTotal, setMonthlyTotal] = useState(0);

    const loadData = async () => {
        try {
            const data = await subscriptionService.getAll();
            setSubscriptions(data);
            setMonthlyTotal(subscriptionService.calculateMonthlyTotal(data));
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

    const getDaysUntilDue = (nextBillingDate?: number) => {
        if (!nextBillingDate) return null;
        const now = new Date();
        const due = new Date(nextBillingDate);
        const diffTime = due.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <GlassHeader
                title="Subscriptions"
                showBack
                onBack={() => navigation.goBack()}
            />
            <ScrollView
                style={styles.list}
                contentContainerStyle={{ paddingTop: 100, paddingBottom: 100 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
            >
                <View style={[styles.summaryCard, { backgroundColor: theme.colors.primary }]}>
                    <Text style={styles.summaryLabel}>Total Monthly Cost</Text>
                    <AmountDisplay amount={monthlyTotal} size="large" style={styles.summaryAmount} />
                    <Text style={styles.summarySubtext}>{subscriptions.length} active subscriptions</Text>
                </View>

                {subscriptions.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="documents-outline" size={48} color={theme.colors.textSecondary} />
                        <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>No subscriptions yet</Text>
                        <Text style={[styles.emptySubtext, { color: theme.colors.textSecondary }]}>Add your recurring payments here</Text>
                    </View>
                ) : (
                    subscriptions.map((sub) => {
                        const daysDue = getDaysUntilDue(sub.next_billing_date);
                        const isDueSoon = daysDue !== null && daysDue <= 7 && daysDue >= 0;

                        return (
                            <TouchableOpacity
                                key={sub.id}
                                style={[styles.card, { backgroundColor: theme.colors.card }]}
                                onPress={() => navigation.navigate('AddSubscription', { subscription: sub } as any)}
                            >
                                <View style={styles.cardHeader}>
                                    <View style={[styles.iconContainer, { backgroundColor: theme.isDark ? 'rgba(255,255,255,0.1)' : '#e3f2fd' }]}>
                                        <Text style={[styles.iconText, { color: theme.colors.primary }]}>{sub.name.charAt(0).toUpperCase()}</Text>
                                    </View>
                                    <View style={styles.cardInfo}>
                                        <Text style={[styles.name, { color: theme.colors.text }]}>{sub.name}</Text>
                                        <Text style={[styles.cycle, { color: theme.colors.textSecondary }]}>
                                            {sub.billing_cycle === 'monthly' ? 'Monthly' : 'Yearly'} • {sub.category}
                                        </Text>
                                    </View>
                                    <AmountDisplay amount={sub.amount} size="medium" />
                                </View>

                                {sub.next_billing_date && (
                                    <View style={[styles.footer, { borderTopColor: theme.colors.border }, isDueSoon && styles.footerDue]}>
                                        <Ionicons
                                            name={isDueSoon ? "alert-circle" : "calendar-outline"}
                                            size={16}
                                            color={isDueSoon ? theme.colors.error : theme.colors.textSecondary}
                                        />
                                        <Text style={[styles.dueDate, { color: theme.colors.textSecondary }, isDueSoon && { color: theme.colors.error, fontWeight: 'bold' }]}>
                                            Due in {daysDue} days ({new Date(sub.next_billing_date).toLocaleDateString()})
                                        </Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        );
                    })
                )}
                <View style={{ height: 100 }} />
            </ScrollView>

            <TouchableOpacity
                style={[styles.fab, { backgroundColor: theme.colors.primary }]}
                onPress={() => navigation.navigate('AddSubscription' as never)}
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
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    iconText: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    cardInfo: {
        flex: 1,
    },
    name: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    cycle: {
        fontSize: 12,
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 12,
        borderTopWidth: 1,
        gap: 6,
    },
    footerDue: {
        backgroundColor: 'rgba(211, 47, 47, 0.1)', // Light red tint
        marginHorizontal: -16,
        marginBottom: -16,
        padding: 12,
        borderBottomLeftRadius: 12,
        borderBottomRightRadius: 12,
        borderTopWidth: 0,
    },
    dueDate: {
        fontSize: 12,
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
