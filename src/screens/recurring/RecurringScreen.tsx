import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { GlassCard } from '../../components/GlassCard';
import { recurringService, RecurringTransaction } from '../../services/recurring.service';
import { useTheme } from '../../contexts/ThemeContext';

export const RecurringScreen = () => {
    const navigation = useNavigation();
    const { theme } = useTheme();
    const [items, setItems] = useState<RecurringTransaction[]>([]);
    const [refreshing, setRefreshing] = useState(false);

    const loadItems = async () => {
        const data = await recurringService.getAll();
        setItems(data);
    };

    useFocusEffect(useCallback(() => { loadItems(); }, []));

    const onRefresh = async () => {
        setRefreshing(true);
        await loadItems();
        setRefreshing(false);
    };

    const handleDelete = (id: string, desc: string) => {
        Alert.alert('Remove Recurring', `Stop "${desc}"?`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Remove', style: 'destructive',
                onPress: async () => { await recurringService.delete(id); await loadItems(); },
            },
        ]);
    };

    const handleProcessNow = async () => {
        const count = await recurringService.processDue();
        Alert.alert('Processed', `${count} transaction(s) created from due recurring items.`);
        await loadItems();
    };

    const formatCurrency = (a: number) => `₹${a.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

    const getFrequencyIcon = (f: string) => {
        switch (f) {
            case 'daily': return 'today-outline';
            case 'weekly': return 'calendar-outline';
            case 'monthly': return 'calendar';
            case 'yearly': return 'calendar-number-outline';
            default: return 'calendar-outline';
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
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
                    <Text style={styles.headerTitle}>Recurring</Text>
                    <TouchableOpacity onPress={() => (navigation as any).navigate('AddRecurring')} style={styles.addBtn}>
                        <Ionicons name="add-circle" size={28} color="#FFF" />
                    </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.processBtn} onPress={handleProcessNow}>
                    <Ionicons name="sync-outline" size={18} color="#FFF" />
                    <Text style={styles.processBtnText}>Process Due Now</Text>
                </TouchableOpacity>
            </LinearGradient>

            <ScrollView
                style={styles.list}
                contentContainerStyle={{ paddingBottom: 100 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {items.length === 0 ? (
                    <GlassCard style={styles.emptyCard}>
                        <Ionicons name="repeat-outline" size={48} color={theme.colors.textSecondary} />
                        <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>No Recurring Items</Text>
                        <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
                            Set up auto-created transactions for rent, salary, etc.
                        </Text>
                    </GlassCard>
                ) : (
                    items.map((item) => (
                        <GlassCard key={item.id} style={styles.itemCard}>
                            <TouchableOpacity
                                style={styles.deleteBtn}
                                onPress={() => handleDelete(item.id, item.description || item.category || 'Item')}
                            >
                                <Ionicons name="trash-outline" size={18} color={theme.colors.error} />
                            </TouchableOpacity>

                            <View style={styles.itemRow}>
                                <View style={[styles.typeIcon, {
                                    backgroundColor: item.type === 'expense' ? theme.colors.error + '15' : theme.colors.success + '15'
                                }]}>
                                    <Ionicons
                                        name={item.type === 'expense' ? 'arrow-up' : 'arrow-down'}
                                        size={20}
                                        color={item.type === 'expense' ? theme.colors.error : theme.colors.success}
                                    />
                                </View>

                                <View style={{ flex: 1, marginLeft: 12 }}>
                                    <Text style={[styles.itemName, { color: theme.colors.text }]}>
                                        {item.description || item.category || item.source || 'Recurring'}
                                    </Text>
                                    <View style={styles.metaRow}>
                                        <Ionicons name={getFrequencyIcon(item.frequency) as any} size={14} color={theme.colors.textSecondary} />
                                        <Text style={[styles.metaText, { color: theme.colors.textSecondary }]}>
                                            {item.frequency.charAt(0).toUpperCase() + item.frequency.slice(1)}
                                        </Text>
                                        <Text style={[styles.metaDot, { color: theme.colors.textSecondary }]}>•</Text>
                                        <Text style={[styles.metaText, { color: theme.colors.textSecondary }]}>
                                            Next: {new Date(item.next_date).toLocaleDateString()}
                                        </Text>
                                    </View>
                                </View>

                                <Text style={[styles.itemAmount, {
                                    color: item.type === 'expense' ? theme.colors.error : theme.colors.success
                                }]}>
                                    {item.type === 'expense' ? '-' : '+'}{formatCurrency(item.amount)}
                                </Text>
                            </View>
                        </GlassCard>
                    ))
                )}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { paddingTop: 50, paddingBottom: 20, paddingHorizontal: 20 },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    backBtn: { padding: 4 },
    addBtn: { padding: 4 },
    headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#FFF' },
    processBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
        backgroundColor: 'rgba(255,255,255,0.2)', paddingVertical: 10, borderRadius: 12,
    },
    processBtnText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
    list: { flex: 1, paddingHorizontal: 16, marginTop: 12 },
    emptyCard: { alignItems: 'center', padding: 40, marginTop: 40 },
    emptyTitle: { fontSize: 18, fontWeight: '600', marginTop: 16 },
    emptySubtitle: { fontSize: 14, marginTop: 8, textAlign: 'center' },
    itemCard: { marginBottom: 12, padding: 16, position: 'relative' },
    deleteBtn: { position: 'absolute', top: 12, right: 12, zIndex: 1, padding: 4 },
    itemRow: { flexDirection: 'row', alignItems: 'center' },
    typeIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
    itemName: { fontSize: 15, fontWeight: '600' },
    metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4 },
    metaText: { fontSize: 12 },
    metaDot: { fontSize: 12 },
    itemAmount: { fontSize: 16, fontWeight: 'bold' },
});
