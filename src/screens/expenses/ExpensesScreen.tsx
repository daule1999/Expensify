import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { transactionService, Transaction } from '../../services/transaction.service';
import { settingsService } from '../../services/settings.service';
import { AmountDisplay } from '../../components/AmountDisplay';
import { SearchBar } from '../../components/SearchBar';
import { FilterModal, FilterState } from '../../components/FilterModal';
import { useTheme } from '../../contexts/ThemeContext';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const ExpensesScreen = () => {
    const navigation = useNavigation();
    const { theme, isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

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

    const loadTransactions = async () => {
        try {
            const data = await transactionService.getAll();
            const expenses = data.filter(t => t.type === 'expense');
            setTransactions(expenses);

            // Load filter options
            const settings = await settingsService.getExpenseSettings();
            const accountSettings = await settingsService.getAccountSettings();
            const uniqueCategories = Array.from(new Set(expenses.map(t => t.category || 'Uncategorized')));
            // Combine predefined categories with used ones
            const allCategories = Array.from(new Set([...settings.defaultCategories, ...uniqueCategories])).sort();

            setFilterOptions({
                categories: allCategories,
                accounts: accountSettings.accounts
            });

        } catch (error) {
            console.error('Failed to load transactions:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    // Filter Logic
    React.useEffect(() => {
        let result = transactions;

        // Search
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(t =>
                (t.description?.toLowerCase().includes(query)) ||
                (t.category?.toLowerCase().includes(query)) ||
                (t.amount.toString().includes(query))
            );
        }

        // Filters
        if (filters.category) {
            result = result.filter(t => t.category === filters.category);
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

        setFilteredTransactions(result);
    }, [transactions, searchQuery, filters]);

    useFocusEffect(
        useCallback(() => {
            loadTransactions();
        }, [])
    );

    const onRefresh = () => {
        setRefreshing(true);
        loadTransactions();
    };

    const handleAddPress = () => {
        // @ts-ignore - navigation types need specific setup
        navigation.navigate('AddExpense');
    };

    const handleItemPress = (item: Transaction) => {
        // @ts-ignore
        navigation.navigate('AddExpense', { transaction: item });
    };

    const renderItem = ({ item }: { item: Transaction }) => (
        <TouchableOpacity
            style={[styles.card, { backgroundColor: theme.colors.surface, shadowColor: theme.colors.shadow }]}
            onPress={() => handleItemPress(item)}
        >
            <View style={styles.cardHeader}>
                <View style={[styles.iconFrame, {
                    backgroundColor: item.type === 'expense' ? (isDark ? 'rgba(255, 59, 48, 0.1)' : '#ffebee') : (isDark ? 'rgba(52, 199, 89, 0.1)' : '#e8f5e9')
                }]}>
                    <Ionicons
                        name={item.type === 'expense' ? 'arrow-up' : 'arrow-down'}
                        size={20}
                        color={item.type === 'expense' ? theme.colors.error : theme.colors.success}
                    />
                </View>
                <View style={styles.cardContent}>
                    <Text style={[styles.category, { color: theme.colors.text }]}>{item.category || item.source || 'Uncategorized'}</Text>
                    <Text style={[styles.description, { color: theme.colors.textSecondary }]} numberOfLines={1}>{item.description}</Text>
                </View>
                <View style={styles.amountContainer}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={[styles.amountSign, { color: item.type === 'expense' ? theme.colors.error : theme.colors.success }]}>
                            {item.type === 'expense' ? '-' : '+'}
                        </Text>
                        <AmountDisplay
                            amount={item.amount}
                            size="small"
                            style={[styles.amount, { color: item.type === 'expense' ? theme.colors.error : theme.colors.success }]}
                        />
                    </View>
                    <Text style={[styles.date, { color: theme.colors.textSecondary }]}>{new Date(item.date).toLocaleDateString()}</Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
            {/* Search Bar */}
            <SearchBar
                value={searchQuery}
                onChangeText={setSearchQuery}
                onFilterPress={() => setFilterModalVisible(true)}
            />

            {loading ? (
                <ActivityIndicator size="large" color={theme.colors.primary} style={styles.loader} />
            ) : (
                <FlatList
                    data={filteredTransactions}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.text} />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Text style={[styles.emptyText, { color: theme.colors.text }]}>No transactions found</Text>
                            <Text style={[styles.emptySubText, { color: theme.colors.textSecondary }]}>
                                {searchQuery || filters.category || filters.account ? 'Try adjusting your filters' : 'Tap the + button to add one'}
                            </Text>
                        </View>
                    }
                />
            )}

            <FilterModal
                visible={filterModalVisible}
                onClose={() => setFilterModalVisible(false)}
                onApply={setFilters}
                categories={filterOptions.categories}
                accounts={filterOptions.accounts}
                currentFilters={filters}
            />

            <TouchableOpacity style={[styles.fab, {
                backgroundColor: theme.colors.primary,
                shadowColor: theme.colors.primary
            }]} onPress={handleAddPress}>
                <Ionicons name="add" size={30} color="#fff" />
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    loader: {
        flex: 1,
        justifyContent: 'center',
    },
    listContent: {
        padding: 16,
        paddingBottom: 80, // Space for FAB
    },
    card: {
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconFrame: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    cardContent: {
        flex: 1,
    },
    category: {
        fontSize: 16,
        fontWeight: '600',
    },
    description: {
        fontSize: 14,
        marginTop: 2,
    },
    amountContainer: {
        alignItems: 'flex-end',
    },
    amountSign: {
        fontSize: 16,
        fontWeight: 'bold',
        marginRight: 2,
    },
    amount: {
        fontWeight: 'bold',
    },
    date: {
        fontSize: 12,
        marginTop: 4,
    },
    fab: {
        position: 'absolute',
        bottom: 110,
        right: 24,
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    emptyState: {
        padding: 40,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    emptySubText: {
        fontSize: 14,
    },
});
