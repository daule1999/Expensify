import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';


interface FilterModalProps {
    visible: boolean;
    onClose: () => void;
    onApply: (filters: FilterState) => void;
    categories: string[];
    accounts: string[];
    currentFilters: FilterState;
}

// Re-defining if not imported, or ensure it matches your project structure. 
// Based on previous file content, FilterState was defined in this file.
export interface FilterState {
    category: string | null;
    account: string | null;
    minAmount: string;
    maxAmount: string;
}

export const FilterModal: React.FC<FilterModalProps> = ({
    visible,
    onClose,
    onApply,
    categories,
    accounts,
    currentFilters
}) => {
    const { theme } = useTheme();
    const [category, setCategory] = useState<string | null>(currentFilters.category);
    const [account, setAccount] = useState<string | null>(currentFilters.account);
    const [minAmount, setMinAmount] = useState(currentFilters.minAmount);
    const [maxAmount, setMaxAmount] = useState(currentFilters.maxAmount);

    const handleApply = () => {
        onApply({ category, account, minAmount, maxAmount });
        onClose();
    };

    const handleReset = () => {
        setCategory(null);
        setAccount(null);
        setMinAmount('');
        setMaxAmount('');
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={[styles.modalContent, { backgroundColor: theme.colors.background }]}>
                    <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
                        <Text style={[styles.title, { color: theme.colors.text }]}>Filter Transactions</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.content}>
                        {/* Account Filter */}
                        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Account</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                            <TouchableOpacity
                                style={[
                                    styles.chip,
                                    { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
                                    account === null && { backgroundColor: theme.colors.primary + '20', borderColor: theme.colors.primary }
                                ]}
                                onPress={() => setAccount(null)}
                            >
                                <Text style={[
                                    styles.chipText,
                                    { color: theme.colors.textSecondary },
                                    account === null && { color: theme.colors.primary, fontWeight: '600' }
                                ]}>All</Text>
                            </TouchableOpacity>
                            {accounts.map(acc => (
                                <TouchableOpacity
                                    key={acc}
                                    style={[
                                        styles.chip,
                                        { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
                                        account === acc && { backgroundColor: theme.colors.primary + '20', borderColor: theme.colors.primary }
                                    ]}
                                    onPress={() => setAccount(acc)}
                                >
                                    <Text style={[
                                        styles.chipText,
                                        { color: theme.colors.textSecondary },
                                        account === acc && { color: theme.colors.primary, fontWeight: '600' }
                                    ]}>{acc}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        {/* Category Filter */}
                        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Category</Text>
                        <View style={styles.chipContainer}>
                            <TouchableOpacity
                                style={[
                                    styles.chip,
                                    { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
                                    category === null && { backgroundColor: theme.colors.primary + '20', borderColor: theme.colors.primary }
                                ]}
                                onPress={() => setCategory(null)}
                            >
                                <Text style={[
                                    styles.chipText,
                                    { color: theme.colors.textSecondary },
                                    category === null && { color: theme.colors.primary, fontWeight: '600' }
                                ]}>All</Text>
                            </TouchableOpacity>
                            {categories.map(cat => (
                                <TouchableOpacity
                                    key={cat}
                                    style={[
                                        styles.chip,
                                        { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
                                        category === cat && { backgroundColor: theme.colors.primary + '20', borderColor: theme.colors.primary }
                                    ]}
                                    onPress={() => setCategory(cat)}
                                >
                                    <Text style={[
                                        styles.chipText,
                                        { color: theme.colors.textSecondary },
                                        category === cat && { color: theme.colors.primary, fontWeight: '600' }
                                    ]}>{cat}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Amount Range */}
                        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Amount Range</Text>
                        <View style={styles.amountContainer}>
                            <TextInput
                                style={[styles.amountInput, { backgroundColor: theme.colors.card, color: theme.colors.text }]}
                                placeholder="Min"
                                placeholderTextColor={theme.colors.textSecondary}
                                value={minAmount}
                                onChangeText={setMinAmount}
                                keyboardType="numeric"
                            />
                            <Text style={[styles.amountDash, { color: theme.colors.textSecondary }]}>-</Text>
                            <TextInput
                                style={[styles.amountInput, { backgroundColor: theme.colors.card, color: theme.colors.text }]}
                                placeholder="Max"
                                placeholderTextColor={theme.colors.textSecondary}
                                value={maxAmount}
                                onChangeText={setMaxAmount}
                                keyboardType="numeric"
                            />
                        </View>
                    </ScrollView>

                    <View style={[styles.footer, { borderTopColor: theme.colors.border }]}>
                        <TouchableOpacity
                            style={[styles.resetButton, { backgroundColor: theme.colors.card }]}
                            onPress={handleReset}
                        >
                            <Text style={[styles.resetButtonText, { color: theme.colors.text }]}>Reset</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.applyButton, { backgroundColor: theme.colors.primary }]}
                            onPress={handleApply}
                        >
                            <Text style={styles.applyButtonText}>Apply Filters</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '80%',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    content: {
        padding: 20,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 12,
        marginTop: 8,
    },
    chipScroll: {
        flexDirection: 'row',
        marginBottom: 16,
        minHeight: 40,
    },
    chipContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 16,
    },
    chip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        marginRight: 8,
        marginBottom: 8,
        borderWidth: 1,
    },
    chipText: {
        fontSize: 14,
    },
    amountContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 20,
    },
    amountInput: {
        flex: 1,
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
    },
    amountDash: {
        fontSize: 20,
    },
    footer: {
        flexDirection: 'row',
        padding: 20,
        borderTopWidth: 1,
        gap: 12,
    },
    resetButton: {
        flex: 1,
        padding: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    resetButtonText: {
        fontSize: 16,
        fontWeight: '600',
    },
    applyButton: {
        flex: 2,
        padding: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    applyButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});
