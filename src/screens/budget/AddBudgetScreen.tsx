import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { budgetService } from '../../services/budget.service';
import { db } from '../../database';
import { useTheme } from '../../contexts/ThemeContext';

const PERIOD_OPTIONS: Array<{ value: 'weekly' | 'monthly' | 'yearly'; label: string }> = [
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'yearly', label: 'Yearly' },
];

export const AddBudgetScreen = () => {
    const navigation = useNavigation();
    const { theme } = useTheme();

    const [categories, setCategories] = useState<string[]>([]);
    const [selectedCategory, setSelectedCategory] = useState('');
    const [customCategory, setCustomCategory] = useState('');
    const [amount, setAmount] = useState('');
    const [period, setPeriod] = useState<'weekly' | 'monthly' | 'yearly'>('monthly');
    const [budgetedCategories, setBudgetedCategories] = useState<string[]>([]);

    useEffect(() => {
        const loadCategories = async () => {
            try {
                const cats = await db.getAllAsync<{ name: string }>(
                    `SELECT DISTINCT name FROM categories WHERE type = 'expense' ORDER BY name ASC`
                );
                setCategories(cats.map(c => c.name));

                // Also get categories that already have budgets
                const budgeted = await budgetService.getBudgetedCategories();
                setBudgetedCategories(budgeted);
            } catch (error) {
                console.error('Error loading categories:', error);
            }
        };
        loadCategories();
    }, []);

    const handleSave = async () => {
        const category = selectedCategory || customCategory.trim();
        if (!category) {
            Alert.alert('Error', 'Please select or enter a category');
            return;
        }
        const parsedAmount = parseFloat(amount);
        if (!parsedAmount || parsedAmount <= 0) {
            Alert.alert('Error', 'Please enter a valid amount greater than zero');
            return;
        }

        try {
            await budgetService.add({ category, amount: parsedAmount, period });
            navigation.goBack();
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to save budget');
        }
    };

    const availableCategories = categories.filter(c => !budgetedCategories.includes(c));

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
                    <Text style={styles.headerTitle}>New Budget</Text>
                    <View style={{ width: 32 }} />
                </View>
            </LinearGradient>

            <ScrollView style={styles.form} contentContainerStyle={{ paddingBottom: 40 }}>
                {/* Category Selection */}
                <Text style={[styles.sectionLabel, { color: theme.colors.text }]}>Category</Text>
                <View style={styles.categoryGrid}>
                    {availableCategories.map((cat) => (
                        <TouchableOpacity
                            key={cat}
                            style={[
                                styles.categoryChip,
                                {
                                    backgroundColor: selectedCategory === cat
                                        ? theme.colors.primary
                                        : theme.colors.surface,
                                    borderColor: selectedCategory === cat
                                        ? theme.colors.primary
                                        : theme.colors.border,
                                },
                            ]}
                            onPress={() => {
                                setSelectedCategory(cat);
                                setCustomCategory('');
                            }}
                        >
                            <Text style={[
                                styles.chipText,
                                { color: selectedCategory === cat ? '#FFF' : theme.colors.text },
                            ]}>
                                {cat}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <TextInput
                    style={[styles.input, { backgroundColor: theme.colors.surface, color: theme.colors.text, borderColor: theme.colors.border }]}
                    value={customCategory}
                    onChangeText={(text) => {
                        setCustomCategory(text);
                        setSelectedCategory('');
                    }}
                    placeholder="Or type a custom category..."
                    placeholderTextColor={theme.colors.textSecondary}
                />

                {/* Amount */}
                <Text style={[styles.sectionLabel, { color: theme.colors.text, marginTop: 24 }]}>
                    Budget Limit (₹)
                </Text>
                <TextInput
                    style={[styles.amountInput, { backgroundColor: theme.colors.surface, color: theme.colors.text, borderColor: theme.colors.border }]}
                    value={amount}
                    onChangeText={setAmount}
                    placeholder="0"
                    placeholderTextColor={theme.colors.textSecondary}
                    keyboardType="decimal-pad"
                />

                {/* Period */}
                <Text style={[styles.sectionLabel, { color: theme.colors.text, marginTop: 24 }]}>
                    Period
                </Text>
                <View style={styles.periodRow}>
                    {PERIOD_OPTIONS.map((opt) => (
                        <TouchableOpacity
                            key={opt.value}
                            style={[
                                styles.periodBtn,
                                {
                                    backgroundColor: period === opt.value
                                        ? theme.colors.primary
                                        : theme.colors.surface,
                                    borderColor: period === opt.value
                                        ? theme.colors.primary
                                        : theme.colors.border,
                                },
                            ]}
                            onPress={() => setPeriod(opt.value)}
                        >
                            <Text style={[
                                styles.periodText,
                                { color: period === opt.value ? '#FFF' : theme.colors.text },
                            ]}>
                                {opt.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Save Button */}
                <TouchableOpacity style={[styles.saveBtn, { backgroundColor: theme.colors.primary }]} onPress={handleSave}>
                    <Ionicons name="checkmark-circle" size={22} color="#FFF" />
                    <Text style={styles.saveBtnText}>Save Budget</Text>
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { paddingTop: 50, paddingBottom: 20, paddingHorizontal: 20 },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    backBtn: { padding: 4 },
    headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#FFF' },
    form: { flex: 1, paddingHorizontal: 20, marginTop: 16 },
    sectionLabel: { fontSize: 15, fontWeight: '600', marginBottom: 12 },
    categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
    categoryChip: {
        paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
        borderWidth: 1, marginBottom: 4,
    },
    chipText: { fontSize: 13, fontWeight: '500' },
    input: {
        fontSize: 15, padding: 14, borderRadius: 12, borderWidth: 1,
    },
    amountInput: {
        fontSize: 28, fontWeight: 'bold', padding: 16, borderRadius: 12, borderWidth: 1, textAlign: 'center',
    },
    periodRow: { flexDirection: 'row', gap: 10 },
    periodBtn: {
        flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1, alignItems: 'center',
    },
    periodText: { fontSize: 14, fontWeight: '600' },
    saveBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        padding: 16, borderRadius: 14, marginTop: 32, gap: 8,
    },
    saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
});
