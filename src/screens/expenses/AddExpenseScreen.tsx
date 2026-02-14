import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Text, Alert, ActivityIndicator, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';

import { transactionService, Transaction } from '../../services/transaction.service';
import { settingsService, ExpenseSettings } from '../../services/settings.service';
import { useTheme } from '../../contexts/ThemeContext';
import { GlassHeader } from '../../components/GlassHeader';
import { GlassInput } from '../../components/GlassInput';
import { GlassCard } from '../../components/GlassCard';
import { AccountSelector } from '../../components/AccountSelector';

export const AddExpenseScreen = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const { transaction } = route.params as { transaction?: Transaction } || {};
    const { theme, isDark } = useTheme();

    const isEditing = !!transaction;

    const [amount, setAmount] = useState(transaction ? transaction.amount.toString() : '');
    const [description, setDescription] = useState(transaction ? transaction.description || '' : '');
    const [category, setCategory] = useState(transaction ? transaction.category || 'Food' : 'Food');
    const [date, setDate] = useState(new Date(transaction ? transaction.date : Date.now()));
    const [loading, setLoading] = useState(false);
    const [settings, setSettings] = useState<ExpenseSettings | null>(null);
    const [customFieldValues, setCustomFieldValues] = useState<{ [key: string]: string }>({});
    const [account, setAccount] = useState(transaction?.account || 'Cash');
    const [showDatePicker, setShowDatePicker] = useState(false);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        const data = await settingsService.getExpenseSettings();
        setSettings(data);
        if (!transaction && data.defaultCategories.length > 0) {
            setCategory(data.defaultCategories[0]);
        }
        if (transaction && transaction.customData) {
            setCustomFieldValues(transaction.customData);
        }
    };

    const handleSave = async () => {
        if (!amount || isNaN(parseFloat(amount))) {
            Alert.alert('Invalid Amount', 'Please enter a valid number');
            return;
        }

        setLoading(true);
        try {
            const data = {
                amount: parseFloat(amount),
                description,
                category,
                date: date.getTime(),
                type: 'expense' as const,
                customData: customFieldValues,
                account
            };

            if (isEditing && transaction) {
                await transactionService.updateTransaction(transaction.id, 'expense', data);
            } else {
                await transactionService.addTransaction(data);
            }
            navigation.goBack();
        } catch (error) {
            Alert.alert('Error', 'Failed to save expense');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!isEditing || !transaction) return;
        Alert.alert(
            'Delete Expense',
            'Are you sure you want to delete this expense?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        setLoading(true);
                        try {
                            await transactionService.deleteTransaction(transaction.id, 'expense');
                            navigation.goBack();
                        } catch (error) {
                            Alert.alert('Error', 'Failed to delete expense');
                        } finally {
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    const renderCustomField = (field: any) => {
        const value = customFieldValues[field.id] || '';

        // Helper to update field value
        const updateField = (newValue: string) => {
            setCustomFieldValues(prev => ({ ...prev, [field.id]: newValue }));
        };

        if (field.type === 'select') {
            return (
                <View style={styles.formGroup} key={field.id}>
                    <Text style={[styles.label, { color: theme.colors.textSecondary }]}>{field.name}</Text>
                    <View style={styles.categoryContainer}>
                        {field.options?.map((option: string) => (
                            <TouchableOpacity
                                key={option}
                                style={[
                                    styles.categoryChip,
                                    value === option && { backgroundColor: theme.colors.primary },
                                    value !== option && { backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.border }
                                ]}
                                onPress={() => updateField(option)}
                            >
                                <Text style={[
                                    styles.categoryText,
                                    { color: value === option ? '#FFF' : theme.colors.text }
                                ]}>{option}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            );
        }

        return (
            <GlassInput
                key={field.id}
                label={field.name}
                placeholder={`Enter ${field.name.toLowerCase()}`}
                value={value}
                onChangeText={updateField}
                keyboardType={field.type === 'number' ? 'numeric' : 'default'}
                icon={field.type === 'text' ? 'text-outline' : 'calculator-outline'}
            />
        );
    };

    if (!settings) return (
        <View style={[styles.container, { backgroundColor: theme.colors.background, justifyContent: 'center' }]}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <LinearGradient
                colors={isDark ? ['#1A0033', '#000000'] : ['#E0EAFC', '#CFDEF3']}
                style={StyleSheet.absoluteFill}
            />

            <GlassHeader
                title={isEditing ? "Edit Expense" : "Add Expense"}
                rightAction={isEditing ? (
                    <TouchableOpacity onPress={handleDelete}>
                        <Ionicons name="trash-outline" size={24} color={theme.colors.error} />
                    </TouchableOpacity>
                ) : null}
            />

            <ScrollView contentContainerStyle={styles.content}>
                <GlassCard style={styles.formCard}>
                    <GlassInput
                        label="Amount (₹)"
                        icon="cash-outline"
                        placeholder="0.00"
                        keyboardType="numeric"
                        value={amount}
                        onChangeText={setAmount}
                    />

                    <GlassInput
                        label="Description"
                        icon="document-text-outline"
                        placeholder="Optional note"
                        value={description}
                        onChangeText={setDescription}
                    />

                    <View style={styles.formGroup}>
                        <Text style={[styles.label, { color: theme.colors.textSecondary }]}>{settings.categoryLabel}</Text>
                        <View style={styles.categoryContainer}>
                            {settings.defaultCategories.map((cat) => (
                                <TouchableOpacity
                                    key={cat}
                                    style={[
                                        styles.categoryChip,
                                        category === cat && { backgroundColor: theme.colors.primary },
                                        category !== cat && { backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.border }
                                    ]}
                                    onPress={() => setCategory(cat)}
                                >
                                    <Text style={[
                                        styles.categoryText,
                                        { color: category === cat ? '#FFF' : theme.colors.text }
                                    ]}>{cat}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    <View style={styles.formGroup}>
                        <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Account</Text>
                        <AccountSelector
                            selectedAccount={account}
                            onSelectAccount={setAccount}
                        />
                    </View>

                    <View style={styles.formGroup}>
                        <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Date</Text>
                        <TouchableOpacity
                            onPress={() => setShowDatePicker(true)}
                            style={[styles.dateButton, { backgroundColor: theme.colors.glass, borderColor: theme.colors.border }]}
                        >
                            <Ionicons name="calendar-outline" size={20} color={theme.colors.text} />
                            <Text style={[styles.dateText, { color: theme.colors.text }]}>
                                {settingsService.formatDate(date.getTime(), settings.dateFormat)}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {showDatePicker && (
                        <DateTimePicker
                            value={date}
                            mode="date"
                            display="default"
                            onChange={(event: any, selectedDate?: Date) => {
                                setShowDatePicker(false);
                                if (selectedDate) setDate(selectedDate);
                            }}
                        />
                    )}

                    {/* Custom Fields Section */}
                    {settings.customFields && settings.customFields.length > 0 && (
                        <View style={styles.divider} />
                    )}
                    {settings.customFields
                        .filter(f => f.enabled)
                        .map((field) => renderCustomField(field))
                    }

                    <TouchableOpacity
                        style={[styles.saveButton, { backgroundColor: theme.colors.primary, opacity: loading ? 0.7 : 1 }]}
                        onPress={handleSave}
                        disabled={loading}
                    >
                        <Text style={styles.saveButtonText}>{loading ? 'Saving...' : 'Save Expense'}</Text>
                    </TouchableOpacity>
                </GlassCard>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        padding: 20,
        paddingTop: 110,
        paddingBottom: 120,
    },
    formCard: {
        marginTop: 10,
    },
    formGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        marginBottom: 8,
        marginLeft: 4,
        fontWeight: '500',
    },
    categoryContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginHorizontal: -4,
    },
    categoryChip: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        margin: 4,
    },
    categoryText: {
        fontSize: 14,
        fontWeight: '500',
    },
    dateButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        borderRadius: 15,
        borderWidth: 1,
    },
    dateText: {
        marginLeft: 10,
        fontSize: 16,
    },
    saveButton: {
        padding: 18,
        borderRadius: 15,
        alignItems: 'center',
        marginTop: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4.65,
        elevation: 8,
    },
    saveButtonText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.1)',
        marginVertical: 20,
    }
});
