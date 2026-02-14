import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { debtService } from '../../services/debt.service';

export const AddDebtScreen = () => {
    const navigation = useNavigation();

    const [name, setName] = useState('');
    const [amount, setAmount] = useState('');
    const [creditor, setCreditor] = useState('');
    const [interestRate, setInterestRate] = useState('');
    const [emiAmount, setEmiAmount] = useState('');
    const [notes, setNotes] = useState('');
    const [startDate, setStartDate] = useState(new Date());
    const [dueDate, setDueDate] = useState<Date | undefined>(undefined);

    const [showStartDatePicker, setShowStartDatePicker] = useState(false);
    const [showDueDatePicker, setShowDueDatePicker] = useState(false);

    const handleSave = async () => {
        if (!name || !amount) {
            Alert.alert('Error', 'Please fill in name and amount');
            return;
        }

        try {
            await debtService.addDebt({
                name,
                principal_amount: parseFloat(amount),
                remaining_amount: parseFloat(amount),
                interest_rate: interestRate ? parseFloat(interestRate) : 0,
                emi_amount: emiAmount ? parseFloat(emiAmount) : 0,
                creditor,
                start_date: startDate.getTime(),
                due_date: dueDate ? dueDate.getTime() : undefined,
                notes
            });
            navigation.goBack();
        } catch (error) {
            Alert.alert('Error', 'Failed to save debt');
        }
    };

    return (
        <ScrollView style={styles.container}>
            <View style={styles.form}>
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Debt Name</Text>
                    <TextInput
                        style={styles.input}
                        value={name}
                        onChangeText={setName}
                        placeholder="e.g. Car Loan, Home Loan"
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Total Amount</Text>
                    <TextInput
                        style={styles.input}
                        value={amount}
                        onChangeText={setAmount}
                        placeholder="0.00"
                        keyboardType="decimal-pad"
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Creditor / Lender</Text>
                    <TextInput
                        style={styles.input}
                        value={creditor}
                        onChangeText={setCreditor}
                        placeholder="Bank Name or Person Info"
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Interest Rate (%)</Text>
                    <TextInput
                        style={styles.input}
                        value={interestRate}
                        onChangeText={setInterestRate}
                        placeholder="0.0"
                        keyboardType="decimal-pad"
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Monthly EMI Amount</Text>
                    <TextInput
                        style={styles.input}
                        value={emiAmount}
                        onChangeText={setEmiAmount}
                        placeholder="0.00"
                        keyboardType="decimal-pad"
                    />
                </View>

                <View style={styles.row}>
                    <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                        <Text style={styles.label}>Start Date</Text>
                        <TouchableOpacity
                            style={styles.dateButton}
                            onPress={() => setShowStartDatePicker(true)}
                        >
                            <Text style={styles.dateText}>{startDate.toLocaleDateString()}</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                        <Text style={styles.label}>Due Date (Optional)</Text>
                        <TouchableOpacity
                            style={styles.dateButton}
                            onPress={() => setShowDueDatePicker(true)}
                        >
                            <Text style={styles.dateText}>
                                {dueDate ? dueDate.toLocaleDateString() : 'Set Date'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {showStartDatePicker && (
                    <DateTimePicker
                        value={startDate}
                        mode="date"
                        display="default"
                        onChange={(event, selectedDate) => {
                            setShowStartDatePicker(false);
                            if (selectedDate) setStartDate(selectedDate);
                        }}
                    />
                )}

                {showDueDatePicker && (
                    <DateTimePicker
                        value={dueDate || new Date()}
                        mode="date"
                        display="default"
                        onChange={(event, selectedDate) => {
                            setShowDueDatePicker(false);
                            if (selectedDate) setDueDate(selectedDate);
                        }}
                    />
                )}

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Notes</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        value={notes}
                        onChangeText={setNotes}
                        placeholder="Additional details..."
                        multiline
                        numberOfLines={3}
                    />
                </View>

                <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                    <Text style={styles.saveButtonText}>Save Debt</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    form: {
        padding: 20,
    },
    inputGroup: {
        marginBottom: 20,
    },
    row: {
        flexDirection: 'row',
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#666',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#fff',
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e0e0e0',
        fontSize: 16,
    },
    textArea: {
        height: 80,
        textAlignVertical: 'top',
    },
    dateButton: {
        backgroundColor: '#fff',
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    dateText: {
        fontSize: 16,
        color: '#333',
    },
    saveButton: {
        backgroundColor: '#D32F2F',
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
