import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { investmentService } from '../../services/investment.service';
import { useTheme } from '../../contexts/ThemeContext';
import { GlassHeader } from '../../components/GlassHeader';

const INVESTMENT_TYPES = ['Stock', 'Mutual Fund', 'Gold', 'Real Estate', 'Crypto', 'Fixed Deposit', 'Other'];

export const AddInvestmentScreen = () => {
    const navigation = useNavigation();
    const { theme } = useTheme();

    const [name, setName] = useState('');
    const [amount, setAmount] = useState('');
    const [currentValue, setCurrentValue] = useState('');
    const [type, setType] = useState(INVESTMENT_TYPES[0]);
    const [purchaseDate, setPurchaseDate] = useState(new Date());
    const [notes, setNotes] = useState('');

    const [showDatePicker, setShowDatePicker] = useState(false);

    const handleSave = async () => {
        if (!name || !amount) {
            Alert.alert('Error', 'Please fill in name and amount');
            return;
        }

        try {
            await investmentService.addInvestment({
                name,
                type,
                amount_invested: parseFloat(amount),
                current_value: currentValue ? parseFloat(currentValue) : parseFloat(amount),
                purchase_date: purchaseDate.getTime(),
                notes
            });
            navigation.goBack();
        } catch (error) {
            Alert.alert('Error', 'Failed to save investment');
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <GlassHeader
                title="Add New Investment"
                showBack
                onBack={() => navigation.goBack()}
            />
            <ScrollView
                style={styles.content}
                contentContainerStyle={{ paddingTop: 100, paddingBottom: 40 }}
            >
                <View style={styles.form}>
                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Investment Name</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, color: theme.colors.text }]}
                            value={name}
                            onChangeText={setName}
                            placeholder="e.g. Apple Stock, Index Fund"
                            placeholderTextColor={theme.colors.textSecondary}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Type</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeSelector}>
                            {INVESTMENT_TYPES.map((t) => (
                                <TouchableOpacity
                                    key={t}
                                    style={[
                                        styles.typeChip,
                                        { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
                                        type === t && { backgroundColor: theme.colors.success, borderColor: theme.colors.success }
                                    ]}
                                    onPress={() => setType(t)}
                                >
                                    <Text style={[
                                        styles.typeText,
                                        { color: theme.colors.textSecondary },
                                        type === t && { color: '#fff', fontWeight: 'bold' }
                                    ]}>{t}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Amount Invested</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, color: theme.colors.text }]}
                            value={amount}
                            onChangeText={(text) => {
                                setAmount(text);
                                if (!currentValue) setCurrentValue(text);
                            }}
                            placeholder="0.00"
                            placeholderTextColor={theme.colors.textSecondary}
                            keyboardType="decimal-pad"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Current Value (Optional)</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, color: theme.colors.text }]}
                            value={currentValue}
                            onChangeText={setCurrentValue}
                            placeholder="Defaults to invested amount"
                            placeholderTextColor={theme.colors.textSecondary}
                            keyboardType="decimal-pad"
                        />
                        <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>Update this later to track profit/loss</Text>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Purchase Date</Text>
                        <TouchableOpacity
                            style={[styles.dateButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
                            onPress={() => setShowDatePicker(true)}
                        >
                            <Text style={[styles.dateText, { color: theme.colors.text }]}>{purchaseDate.toLocaleDateString()}</Text>
                        </TouchableOpacity>
                    </View>

                    {showDatePicker && (
                        <DateTimePicker
                            value={purchaseDate}
                            mode="date"
                            display="default"
                            onChange={(event, selectedDate) => {
                                setShowDatePicker(false);
                                if (selectedDate) setPurchaseDate(selectedDate);
                            }}
                        />
                    )}

                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Notes</Text>
                        <TextInput
                            style={[styles.input, styles.textArea, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, color: theme.colors.text }]}
                            value={notes}
                            onChangeText={setNotes}
                            placeholder="Ticker symbol, account info, etc."
                            placeholderTextColor={theme.colors.textSecondary}
                            multiline
                            numberOfLines={3}
                        />
                    </View>

                    <TouchableOpacity style={[styles.saveButton, { backgroundColor: theme.colors.success }]} onPress={handleSave}>
                        <Text style={styles.saveButtonText}>Save Investment</Text>
                    </TouchableOpacity>
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
    textArea: {
        height: 80,
        textAlignVertical: 'top',
    },
    hint: {
        fontSize: 12,
        marginTop: 4,
    },
    dateButton: {
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
    },
    dateText: {
        fontSize: 16,
    },
    typeSelector: {
        flexDirection: 'row',
    },
    typeChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        marginRight: 8,
    },
    typeText: {
        fontSize: 14,
    },
    saveButton: {
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 10,
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
