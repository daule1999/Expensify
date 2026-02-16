import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { recurringService } from '../../services/recurring.service';
import { db } from '../../database';
import { useTheme } from '../../contexts/ThemeContext';

const FREQUENCY_OPTIONS: Array<{ value: 'daily' | 'weekly' | 'monthly' | 'yearly'; label: string }> = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'yearly', label: 'Yearly' },
];

export const AddRecurringScreen = () => {
    const navigation = useNavigation();
    const { theme } = useTheme();

    const [type, setType] = useState<'expense' | 'income'>('expense');
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('');
    const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');
    const [categories, setCategories] = useState<string[]>([]);

    useEffect(() => {
        const loadCategories = async () => {
            try {
                const catType = type === 'expense' ? 'expense' : 'income';
                const cats = await db.getAllAsync<{ name: string }>(
                    `SELECT DISTINCT name FROM categories WHERE type = ? ORDER BY name ASC`,
                    [catType]
                );
                setCategories(cats.map(c => c.name));
            } catch (error) {
                console.error('Error loading categories:', error);
            }
        };
        loadCategories();
    }, [type]);

    const handleSave = async () => {
        const parsedAmount = parseFloat(amount);
        if (!parsedAmount || parsedAmount <= 0) {
            Alert.alert('Error', 'Enter a valid amount');
            return;
        }

        try {
            // Set next_date to the 1st of next month for monthly, etc.
            const now = new Date();
            let nextDate: Date;

            switch (frequency) {
                case 'daily':
                    nextDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
                    break;
                case 'weekly':
                    nextDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
                    break;
                case 'monthly':
                    nextDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
                    break;
                case 'yearly':
                    nextDate = new Date(now.getFullYear() + 1, 0, 1);
                    break;
                default:
                    nextDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
            }

            await recurringService.add({
                amount: parsedAmount,
                type,
                category: type === 'expense' ? (category || 'Uncategorized') : undefined,
                source: type === 'income' ? (category || 'Other') : undefined,
                description,
                account: 'Cash',
                frequency,
                next_date: nextDate.getTime(),
            });

            navigation.goBack();
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to save');
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
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Ionicons name="arrow-back" size={24} color="#FFF" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Add Recurring</Text>
                    <View style={{ width: 32 }} />
                </View>
            </LinearGradient>

            <ScrollView style={styles.form} contentContainerStyle={{ paddingBottom: 40 }}>
                {/* Type Toggle */}
                <View style={styles.typeRow}>
                    {(['expense', 'income'] as const).map((t) => (
                        <TouchableOpacity
                            key={t}
                            style={[
                                styles.typeBtn,
                                {
                                    backgroundColor: type === t
                                        ? (t === 'expense' ? theme.colors.error : theme.colors.success)
                                        : theme.colors.surface,
                                    borderColor: type === t
                                        ? (t === 'expense' ? theme.colors.error : theme.colors.success)
                                        : theme.colors.border,
                                },
                            ]}
                            onPress={() => setType(t)}
                        >
                            <Ionicons
                                name={t === 'expense' ? 'arrow-up' : 'arrow-down'}
                                size={18}
                                color={type === t ? '#FFF' : theme.colors.text}
                            />
                            <Text style={[styles.typeBtnText, { color: type === t ? '#FFF' : theme.colors.text }]}>
                                {t.charAt(0).toUpperCase() + t.slice(1)}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Amount */}
                <Text style={[styles.label, { color: theme.colors.text }]}>Amount (₹)</Text>
                <TextInput
                    style={[styles.amountInput, { backgroundColor: theme.colors.surface, color: theme.colors.text, borderColor: theme.colors.border }]}
                    value={amount}
                    onChangeText={setAmount}
                    placeholder="0"
                    placeholderTextColor={theme.colors.textSecondary}
                    keyboardType="decimal-pad"
                />

                {/* Description */}
                <Text style={[styles.label, { color: theme.colors.text }]}>Description</Text>
                <TextInput
                    style={[styles.input, { backgroundColor: theme.colors.surface, color: theme.colors.text, borderColor: theme.colors.border }]}
                    value={description}
                    onChangeText={setDescription}
                    placeholder="e.g. Monthly rent, Salary credit"
                    placeholderTextColor={theme.colors.textSecondary}
                />

                {/* Category */}
                <Text style={[styles.label, { color: theme.colors.text }]}>Category</Text>
                <View style={styles.categoryGrid}>
                    {categories.map((cat) => (
                        <TouchableOpacity
                            key={cat}
                            style={[styles.chip, {
                                backgroundColor: category === cat ? theme.colors.primary : theme.colors.surface,
                                borderColor: category === cat ? theme.colors.primary : theme.colors.border,
                            }]}
                            onPress={() => setCategory(cat)}
                        >
                            <Text style={[styles.chipText, { color: category === cat ? '#FFF' : theme.colors.text }]}>
                                {cat}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
                <TextInput
                    style={[styles.input, { backgroundColor: theme.colors.surface, color: theme.colors.text, borderColor: theme.colors.border }]}
                    value={category}
                    onChangeText={setCategory}
                    placeholder="Or type a custom category..."
                    placeholderTextColor={theme.colors.textSecondary}
                />

                {/* Frequency */}
                <Text style={[styles.label, { color: theme.colors.text, marginTop: 16 }]}>Frequency</Text>
                <View style={styles.freqRow}>
                    {FREQUENCY_OPTIONS.map((opt) => (
                        <TouchableOpacity
                            key={opt.value}
                            style={[styles.freqBtn, {
                                backgroundColor: frequency === opt.value ? theme.colors.primary : theme.colors.surface,
                                borderColor: frequency === opt.value ? theme.colors.primary : theme.colors.border,
                            }]}
                            onPress={() => setFrequency(opt.value)}
                        >
                            <Text style={[styles.freqText, { color: frequency === opt.value ? '#FFF' : theme.colors.text }]}>
                                {opt.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Save */}
                <TouchableOpacity style={[styles.saveBtn, { backgroundColor: theme.colors.primary }]} onPress={handleSave}>
                    <Ionicons name="checkmark-circle" size={22} color="#FFF" />
                    <Text style={styles.saveBtnText}>Save Recurring</Text>
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { paddingTop: 50, paddingBottom: 20, paddingHorizontal: 20 },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#FFF' },
    form: { flex: 1, paddingHorizontal: 20, marginTop: 16 },
    typeRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
    typeBtn: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 6, paddingVertical: 14, borderRadius: 12, borderWidth: 1,
    },
    typeBtnText: { fontSize: 15, fontWeight: '600' },
    label: { fontSize: 15, fontWeight: '600', marginBottom: 8, marginTop: 8 },
    amountInput: { fontSize: 28, fontWeight: 'bold', padding: 16, borderRadius: 12, borderWidth: 1, textAlign: 'center' },
    input: { fontSize: 15, padding: 14, borderRadius: 12, borderWidth: 1 },
    categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
    chipText: { fontSize: 13, fontWeight: '500' },
    freqRow: { flexDirection: 'row', gap: 8 },
    freqBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
    freqText: { fontSize: 13, fontWeight: '600' },
    saveBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        padding: 16, borderRadius: 14, marginTop: 32, gap: 8,
    },
    saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
});
