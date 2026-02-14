import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Switch, Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { subscriptionService, Subscription } from '../../services/subscription.service';
import { useTheme } from '../../contexts/ThemeContext';
import { GlassHeader } from '../../components/GlassHeader';

export const AddSubscriptionScreen = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const { theme } = useTheme();
    const editingSubscription = (route.params as any)?.subscription as Subscription | undefined;

    const [name, setName] = useState(editingSubscription?.name || '');
    const [amount, setAmount] = useState(editingSubscription?.amount.toString() || '');
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>(editingSubscription?.billing_cycle || 'monthly');
    const [startDate, setStartDate] = useState(editingSubscription ? new Date(editingSubscription.start_date) : new Date());
    const [category, setCategory] = useState(editingSubscription?.category || '');
    const [autoRenew, setAutoRenew] = useState(editingSubscription?.auto_renew === 1 ?? true);
    const [showDatePicker, setShowDatePicker] = useState(false);

    const handleSave = async () => {
        if (!name || !amount) {
            Alert.alert('Error', 'Please fill in name and amount');
            return;
        }

        try {
            const data = {
                name,
                amount: parseFloat(amount),
                billing_cycle: billingCycle,
                start_date: startDate.getTime(),
                category: category || 'Uncategorized',
                is_active: 1,
                auto_renew: autoRenew ? 1 : 0
            };

            if (editingSubscription) {
                await subscriptionService.updateSubscription(editingSubscription.id, data);
            } else {
                await subscriptionService.addSubscription(data);
            }
            navigation.goBack();
        } catch (error) {
            Alert.alert('Error', 'Failed to save subscription');
        }
    };

    const handleDelete = async () => {
        if (!editingSubscription) return;

        Alert.alert(
            'Delete Subscription',
            'Are you sure you want to delete this subscription?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await subscriptionService.deleteSubscription(editingSubscription.id);
                            navigation.goBack();
                        } catch (error) {
                            Alert.alert('Error', 'Failed to delete subscription');
                        }
                    }
                }
            ]
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <GlassHeader
                title={editingSubscription ? "Edit Subscription" : "New Subscription"}
                showBack
                onBack={() => navigation.goBack()}
            />
            <ScrollView
                style={styles.content}
                contentContainerStyle={{ paddingTop: 100, paddingBottom: 40 }}
            >
                <View style={styles.form}>
                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Name</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, color: theme.colors.text }]}
                            value={name}
                            onChangeText={setName}
                            placeholder="Netflix, Spotify, etc."
                            placeholderTextColor={theme.colors.textSecondary}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Amount</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, color: theme.colors.text }]}
                            value={amount}
                            onChangeText={setAmount}
                            placeholder="0.00"
                            placeholderTextColor={theme.colors.textSecondary}
                            keyboardType="decimal-pad"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Category</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, color: theme.colors.text }]}
                            value={category}
                            onChangeText={setCategory}
                            placeholder="Entertainment, Utilities, etc."
                            placeholderTextColor={theme.colors.textSecondary}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Billing Cycle</Text>
                        <View style={[styles.cycleSelector, { backgroundColor: theme.colors.border }]}>
                            <TouchableOpacity
                                style={[styles.cycleOption, billingCycle === 'monthly' && { backgroundColor: theme.colors.card }]}
                                onPress={() => setBillingCycle('monthly')}
                            >
                                <Text style={[styles.cycleText, { color: theme.colors.textSecondary }, billingCycle === 'monthly' && { color: theme.colors.primary, fontWeight: 'bold' }]}>Monthly</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.cycleOption, billingCycle === 'yearly' && { backgroundColor: theme.colors.card }]}
                                onPress={() => setBillingCycle('yearly')}
                            >
                                <Text style={[styles.cycleText, { color: theme.colors.textSecondary }, billingCycle === 'yearly' && { color: theme.colors.primary, fontWeight: 'bold' }]}>Yearly</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Start Date</Text>
                        <TouchableOpacity
                            style={[styles.dateButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
                            onPress={() => setShowDatePicker(true)}
                        >
                            <Text style={[styles.dateText, { color: theme.colors.text }]}>{startDate.toLocaleDateString()}</Text>
                        </TouchableOpacity>
                    </View>

                    {showDatePicker && (
                        <DateTimePicker
                            value={startDate}
                            mode="date"
                            display="default"
                            onChange={(event, selectedDate) => {
                                setShowDatePicker(false);
                                if (selectedDate) setStartDate(selectedDate);
                            }}
                        />
                    )}

                    <View style={styles.switchRow}>
                        <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Auto-renewal</Text>
                        <Switch
                            value={autoRenew}
                            onValueChange={setAutoRenew}
                            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                            thumbColor="#fff"
                        />
                    </View>

                    <TouchableOpacity style={[styles.saveButton, { backgroundColor: theme.colors.primary }]} onPress={handleSave}>
                        <Text style={styles.saveButtonText}>{editingSubscription ? 'Update' : 'Save'} Subscription</Text>
                    </TouchableOpacity>

                    {editingSubscription && (
                        <TouchableOpacity style={[styles.deleteButton, { backgroundColor: 'rgba(211, 47, 47, 0.1)', borderColor: 'rgba(211, 47, 47, 0.3)' }]} onPress={handleDelete}>
                            <Text style={[styles.deleteButtonText, { color: theme.colors.error }]}>Delete Subscription</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
    },
    form: {
        padding: 20,
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
    },
    input: {
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        fontSize: 16,
    },
    cycleSelector: {
        flexDirection: 'row',
        borderRadius: 8,
        padding: 4,
    },
    cycleOption: {
        flex: 1,
        padding: 10,
        alignItems: 'center',
        borderRadius: 6,
    },
    cycleText: {
        fontWeight: '600',
    },
    dateButton: {
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
    },
    dateText: {
        fontSize: 16,
    },
    switchRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    saveButton: {
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: 12,
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    deleteButton: {
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1,
    },
    deleteButtonText: {
        fontSize: 16,
        fontWeight: '600',
    },
});
