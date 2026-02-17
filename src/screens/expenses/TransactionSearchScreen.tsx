import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    TextInput, FlatList,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { searchTransactions, SearchFilters, SearchResult } from '../../services/search.service';
import { settingsService } from '../../services/settings.service';
import { useTheme } from '../../contexts/ThemeContext';
import { GlassHeader } from '../../components/GlassHeader';
import { GlassCard } from '../../components/GlassCard';

export const TransactionSearchScreen = () => {
    const navigation = useNavigation();
    const { theme, isDark } = useTheme();

    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [hasSearched, setHasSearched] = useState(false);
    const [currency, setCurrency] = useState('₹');
    const [typeFilter, setTypeFilter] = useState<'all' | 'expense' | 'income'>('all');
    const [showFilters, setShowFilters] = useState(false);
    const [amountMin, setAmountMin] = useState('');
    const [amountMax, setAmountMax] = useState('');

    useEffect(() => {
        settingsService.getProfileSettings().then(p => setCurrency(p.currency || '₹'));
    }, []);

    const handleSearch = async () => {
        const filters: SearchFilters = {};
        if (query.trim()) filters.query = query.trim();
        if (typeFilter !== 'all') filters.type = typeFilter;
        if (amountMin) filters.amountMin = parseFloat(amountMin);
        if (amountMax) filters.amountMax = parseFloat(amountMax);

        const res = await searchTransactions(filters);
        setResults(res);
        setHasSearched(true);
    };

    const clearSearch = () => {
        setQuery('');
        setAmountMin('');
        setAmountMax('');
        setTypeFilter('all');
        setResults([]);
        setHasSearched(false);
    };

    const formatDate = (ts: number) => {
        const d = new Date(ts);
        return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
    };

    const renderItem = ({ item }: { item: SearchResult }) => (
        <View style={[styles.resultRow, { borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]}>
            <View style={[styles.typeIndicator, { backgroundColor: item.type === 'expense' ? '#FF6B6B' : '#4CAF50' }]} />
            <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={[styles.resultTitle, { color: theme.colors.text }]}>
                    {item.category || item.source || 'Unknown'}
                </Text>
                {item.description ? (
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 12, marginTop: 2 }} numberOfLines={1}>
                        {item.description}
                    </Text>
                ) : null}
                <Text style={{ color: theme.colors.textSecondary, fontSize: 11, marginTop: 2 }}>
                    {formatDate(item.date)}
                </Text>
            </View>
            <Text style={[styles.resultAmount, { color: item.type === 'expense' ? '#FF6B6B' : '#4CAF50' }]}>
                {item.type === 'expense' ? '-' : '+'}{currency}{item.amount.toLocaleString()}
            </Text>
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <LinearGradient
                colors={isDark ? ['#1A0033', '#000000'] : ['#E0EAFC', '#CFDEF3']}
                style={StyleSheet.absoluteFill}
            />
            <GlassHeader title="Search Transactions" showBack onBack={() => navigation.goBack()} />

            <View style={styles.content}>
                {/* Search Bar */}
                <GlassCard style={{ padding: 12, borderRadius: 16, marginBottom: 12 }}>
                    <View style={styles.searchRow}>
                        <Ionicons name="search-outline" size={20} color={theme.colors.textSecondary} />
                        <TextInput
                            style={[styles.searchInput, { color: theme.colors.text }]}
                            placeholder="Search by description, category..."
                            placeholderTextColor={theme.colors.textSecondary}
                            value={query}
                            onChangeText={setQuery}
                            onSubmitEditing={handleSearch}
                            returnKeyType="search"
                        />
                        {query.length > 0 && (
                            <TouchableOpacity onPress={clearSearch}>
                                <Ionicons name="close-circle" size={20} color={theme.colors.textSecondary} />
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Type Filter Tabs */}
                    <View style={[styles.filterTabs, { marginTop: 10 }]}>
                        {(['all', 'expense', 'income'] as const).map(t => (
                            <TouchableOpacity
                                key={t}
                                style={[
                                    styles.filterTab,
                                    typeFilter === t && { backgroundColor: theme.colors.primary },
                                    typeFilter !== t && { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' },
                                ]}
                                onPress={() => setTypeFilter(t)}
                            >
                                <Text style={{ color: typeFilter === t ? '#FFF' : theme.colors.text, fontSize: 12, fontWeight: '600' }}>
                                    {t === 'all' ? 'All' : t.charAt(0).toUpperCase() + t.slice(1)}
                                </Text>
                            </TouchableOpacity>
                        ))}
                        <TouchableOpacity
                            style={[styles.filterTab, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}
                            onPress={() => setShowFilters(!showFilters)}
                        >
                            <Ionicons name="options-outline" size={16} color={theme.colors.text} />
                        </TouchableOpacity>
                    </View>

                    {/* Amount Filters (collapsible) */}
                    {showFilters && (
                        <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                            <TextInput
                                style={[styles.amountInput, { color: theme.colors.text, borderColor: theme.colors.border }]}
                                placeholder="Min amt"
                                placeholderTextColor={theme.colors.textSecondary}
                                value={amountMin}
                                onChangeText={setAmountMin}
                                keyboardType="numeric"
                            />
                            <TextInput
                                style={[styles.amountInput, { color: theme.colors.text, borderColor: theme.colors.border }]}
                                placeholder="Max amt"
                                placeholderTextColor={theme.colors.textSecondary}
                                value={amountMax}
                                onChangeText={setAmountMax}
                                keyboardType="numeric"
                            />
                        </View>
                    )}

                    {/* Search Button */}
                    <TouchableOpacity
                        style={[styles.searchButton, { backgroundColor: theme.colors.primary }]}
                        onPress={handleSearch}
                    >
                        <Ionicons name="search" size={18} color="#FFF" />
                        <Text style={{ color: '#FFF', fontWeight: '600', marginLeft: 6 }}>Search</Text>
                    </TouchableOpacity>
                </GlassCard>

                {/* Results */}
                {hasSearched && (
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 12, marginBottom: 8, marginLeft: 4 }}>
                        {results.length} result{results.length !== 1 ? 's' : ''} found
                    </Text>
                )}

                <FlatList
                    data={results}
                    keyExtractor={item => `${item.type}-${item.id}`}
                    renderItem={renderItem}
                    ListEmptyComponent={
                        hasSearched ? (
                            <View style={{ alignItems: 'center', padding: 40 }}>
                                <Ionicons name="search-outline" size={48} color={theme.colors.textSecondary} />
                                <Text style={{ color: theme.colors.textSecondary, marginTop: 12 }}>No transactions found</Text>
                            </View>
                        ) : (
                            <View style={{ alignItems: 'center', padding: 40 }}>
                                <Ionicons name="document-text-outline" size={48} color={theme.colors.textSecondary} />
                                <Text style={{ color: theme.colors.textSecondary, marginTop: 12 }}>
                                    Search across all your transactions
                                </Text>
                            </View>
                        )
                    }
                    contentContainerStyle={{ paddingBottom: 100 }}
                />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: { flex: 1, paddingHorizontal: 16, paddingTop: 110 },
    searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    searchInput: { flex: 1, fontSize: 16, height: 40 },
    filterTabs: { flexDirection: 'row', gap: 6 },
    filterTab: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
    amountInput: {
        flex: 1, borderWidth: 1, borderRadius: 10, padding: 8, fontSize: 14,
    },
    searchButton: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        padding: 12, borderRadius: 12, marginTop: 10,
    },
    resultRow: {
        flexDirection: 'row', alignItems: 'center', paddingVertical: 12,
        borderBottomWidth: 1, paddingHorizontal: 4,
    },
    typeIndicator: { width: 4, height: 32, borderRadius: 2 },
    resultTitle: { fontSize: 15, fontWeight: '500' },
    resultAmount: { fontSize: 15, fontWeight: '600' },
});
