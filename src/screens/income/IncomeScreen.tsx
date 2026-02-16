import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { transactionService, Transaction } from '../../services/transaction.service';
import { settingsService } from '../../services/settings.service';
import { usePrivacy } from '../../contexts/PrivacyContext';
import { SearchBar } from '../../components/SearchBar';
import { FilterModal, FilterState } from '../../components/FilterModal';
import { useTheme } from '../../contexts/ThemeContext';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const IncomeScreen = () => {
    const navigation = useNavigation();
    const { isAmountHidden } = usePrivacy();
    const { theme, isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const [income, setIncome] = useState<Transaction[]>([]);
    const [filteredIncome, setFilteredIncome] = useState<Transaction[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [currency, setCurrency] = useState('₹');

    // Search & Filter State
    const [searchQuery, setSearchQuery] = useState('');
    const [filterModalVisible, setFilterModalVisible] = useState(false);
    const [filters, setFilters] = useState<FilterState>({
        category: null,
        account: null,
        minAmount: '',
        maxAmount: ''
    });
    const [filterOptions, setFilterOptions] = useState<{ categories: string[], accounts: string[] }>({
        categories: [],
        accounts: []
    });

    useFocusEffect(
        useCallback(() => {
            loadIncome();
            loadSettings();
        }, [])
    );

    const loadSettings = async () => {
        const profile = await settingsService.getProfileSettings();
        setCurrency(profile.currency);
    };

    const loadIncome = async () => {
        const data = await transactionService.getAll();
        const incomeOnly = data.filter(t => t.type === 'income');
        setIncome(incomeOnly);

        // Load filter options
        const settings = await settingsService.getIncomeSettings();
        const accountSettings = await settingsService.getAccountSettings();
        const uniqueSources = Array.from(new Set(incomeOnly.map(t => t.source || 'Unknown')));
        // Combine predefined sources with used ones
        const allSources = Array.from(new Set([...settings.defaultSources, ...uniqueSources])).sort();

        setFilterOptions({
            categories: allSources,
            accounts: accountSettings.accounts
        });
    };

    // Filter Logic
    useEffect(() => {
        let result = income;

        // Search
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(t =>
                (t.description?.toLowerCase().includes(query)) ||
                (t.source?.toLowerCase().includes(query)) ||
                (t.amount.toString().includes(query))
            );
        }

        // Filters
        if (filters.category) {
            result = result.filter(t => t.source === filters.category);
        }
        if (filters.account) {
            result = result.filter(t => t.account === filters.account);
        }
        if (filters.minAmount) {
            result = result.filter(t => t.amount >= parseFloat(filters.minAmount));
        }
        if (filters.maxAmount) {
            result = result.filter(t => t.amount <= parseFloat(filters.maxAmount));
        }

        setFilteredIncome(result);
    }, [income, searchQuery, filters]);

    const onRefresh = async () => {
        setRefreshing(true);
        await loadIncome();
        setRefreshing(false);
    };

    const handleAddIncome = () => {
        navigation.navigate('AddIncome' as never);
    };

    const handleEditIncome = (transaction: Transaction) => {
        (navigation as any).navigate('AddIncome', { transaction });
    };

    const formatAmount = (amount: number) => {
        if (isAmountHidden) return '****';
        return `${currency}${amount.toLocaleString()}`;
    };

    const formatDate = (timestamp: number) => {
        const date = new Date(timestamp);
        return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const getAccountIcon = (account?: string) => {
        if (account === 'Cash') return 'cash-outline';
        return 'card-outline';
    };

    const renderIncomeItem = ({ item }: { item: Transaction }) => (
        <TouchableOpacity
            style={[styles.incomeCard, { backgroundColor: theme.colors.surface, shadowColor: theme.colors.shadow }]}
            onPress={() => handleEditIncome(item)}
        >
            <View style={styles.incomeHeader}>
                <View style={[styles.sourceContainer]}>
                    <View style={[styles.sourceIcon, { backgroundColor: isDark ? 'rgba(52, 199, 89, 0.1)' : '#E8F5E9' }]}>
                        <Text style={styles.sourceEmoji}>💰</Text>
                    </View>
                    <View style={styles.incomeDetails}>
                        <Text style={[styles.source, { color: theme.colors.text }]}>{item.source || 'Income'}</Text>
                        {item.description && (
                            <Text style={[styles.description, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                                {item.description}
                            </Text>
                        )}
                    </View>
                </View>
                <View style={styles.amountContainer}>
                    <Text style={[styles.amount, { color: theme.colors.success }]}>{formatAmount(item.amount)}</Text>
                    <View style={[styles.accountBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#f0f0f0' }]}>
                        <Ionicons name={getAccountIcon(item.account)} size={12} color={theme.colors.textSecondary} />
                        <Text style={[styles.accountText, { color: theme.colors.textSecondary }]}>{item.account || 'Cash'}</Text>
                    </View>
                </View>
            </View>
            <View style={[styles.incomeFooter, { borderTopColor: theme.colors.border }]}>
                <Text style={[styles.date, { color: theme.colors.textSecondary }]}>{formatDate(item.date)}</Text>
                <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
            </View>
        </TouchableOpacity>
    );

    const renderEmptyState = () => (
        <View style={styles.emptyState}>
            <View style={[styles.emptyIconContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f9f9f9' }]}>
                <Ionicons name="wallet-outline" size={60} color={theme.colors.textSecondary} />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>No Income Found</Text>
            <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
                {searchQuery || filters.category || filters.account ? 'Try adjusting your search or filters to find what you looking for.' : 'Start tracking your earnings by adding your first income.'}
            </Text>
            {!searchQuery && !filters.category && !filters.account && (
                <TouchableOpacity
                    style={[styles.emptyButton, { backgroundColor: theme.colors.success }]}
                    onPress={handleAddIncome}
                >
                    <Text style={styles.emptyButtonText}>Add Income</Text>
                </TouchableOpacity>
            )}
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
            {/* Search Bar */}
            <SearchBar
                value={searchQuery}
                onChangeText={setSearchQuery}
                onFilterPress={() => setFilterModalVisible(true)}
            />

            <FlatList
                data={filteredIncome}
                renderItem={renderIncomeItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={filteredIncome.length === 0 ? styles.emptyContainer : styles.listContainer}
                ListEmptyComponent={renderEmptyState}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.text} />
                }
            />

            <FilterModal
                visible={filterModalVisible}
                onClose={() => setFilterModalVisible(false)}
                onApply={setFilters}
                categories={filterOptions.categories}
                accounts={filterOptions.accounts}
                currentFilters={filters}
            />

            <TouchableOpacity
                style={[styles.fab, { backgroundColor: theme.colors.success, shadowColor: theme.colors.success }]}
                onPress={handleAddIncome}
            >
                <Ionicons name="add" size={28} color="#fff" />
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    listContainer: {
        padding: 16,
        paddingBottom: 80,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    incomeCard: {
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    incomeHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    sourceContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    sourceIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    sourceEmoji: {
        fontSize: 20,
    },
    incomeDetails: {
        flex: 1,
    },
    source: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 2,
    },
    description: {
        fontSize: 14,
    },
    amountContainer: {
        alignItems: 'flex-end',
    },
    amount: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    accountBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 10,
    },
    accountText: {
        fontSize: 11,
    },
    incomeFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 12,
        borderTopWidth: 1,
    },
    date: {
        fontSize: 13,
    },
    emptyState: {
        padding: 60,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyIconContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 10,
        textAlign: 'center',
    },
    emptySubtitle: {
        fontSize: 15,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 24,
    },
    emptyButton: {
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 25,
    },
    emptyButtonText: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 16,
    },
    fab: {
        position: 'absolute',
        right: 20,
        bottom: 110,
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
});
