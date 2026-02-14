import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, TextInput } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { debtService, Debt, EMI } from '../../services/debt.service';
import { AmountDisplay } from '../../components/AmountDisplay';
import { useFocusEffect } from '@react-navigation/native';

export const DebtDetailsScreen = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const { debt } = route.params as { debt: Debt };

    const [currentDebt, setCurrentDebt] = useState<Debt>(debt);
    const [emis, setEmis] = useState<EMI[]>([]);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentAmount, setPaymentAmount] = useState('');

    const loadData = async () => {
        const updatedDebt = await debtService.getDebtById(debt.id);
        const emiList = await debtService.getAllEMIs(debt.id);
        if (updatedDebt) setCurrentDebt(updatedDebt);
        setEmis(emiList);
    };

    useFocusEffect(
        React.useCallback(() => {
            loadData();
        }, [])
    );

    const handleAddPayment = async () => {
        if (!paymentAmount) return;

        try {
            await debtService.addPayment(currentDebt.id, parseFloat(paymentAmount), Date.now());
            setPaymentAmount('');
            setShowPaymentModal(false);
            loadData();
            Alert.alert('Success', 'Payment recorded');
        } catch (error) {
            Alert.alert('Error', 'Failed to record payment');
        }
    };

    const handleDelete = async () => {
        Alert.alert(
            'Delete Debt',
            'Are you sure? This will delete all payment history for this debt.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await debtService.deleteDebt(currentDebt.id);
                            navigation.goBack();
                        } catch (error) {
                            Alert.alert('Error', 'Failed to delete debt');
                        }
                    }
                }
            ]
        );
    };

    const progress = currentDebt.principal_amount > 0
        ? ((currentDebt.principal_amount - currentDebt.remaining_amount) / currentDebt.principal_amount) * 100
        : 0;

    return (
        <View style={styles.container}>
            <ScrollView style={styles.content}>
                <View style={styles.headerCard}>
                    <Text style={styles.title}>{currentDebt.name}</Text>
                    <Text style={styles.creditor}>{currentDebt.creditor}</Text>

                    <View style={styles.progressSection}>
                        <View style={styles.amountRow}>
                            <View>
                                <Text style={styles.label}>Remaining</Text>
                                <AmountDisplay amount={currentDebt.remaining_amount} size="large" style={styles.amount} />
                            </View>
                            <View style={{ alignItems: 'flex-end' }}>
                                <Text style={styles.label}>Total</Text>
                                <AmountDisplay amount={currentDebt.principal_amount} size="medium" style={{ color: '#666' }} />
                            </View>
                        </View>
                        <View style={styles.progressBarBg}>
                            <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
                        </View>
                        <Text style={styles.progressText}>{progress.toFixed(1)}% Paid</Text>
                    </View>

                    {currentDebt.notes ? (
                        <Text style={styles.notes}>{currentDebt.notes}</Text>
                    ) : null}
                </View>

                <View style={styles.historySection}>
                    <Text style={styles.sectionTitle}>Payment History</Text>
                    {emis.length === 0 ? (
                        <Text style={styles.emptyText}>No payments recorded yet</Text>
                    ) : (
                        emis.map((emi) => (
                            <View key={emi.id} style={styles.emiItem}>
                                <View>
                                    <Text style={styles.emiDate}>{new Date(emi.start_date).toLocaleDateString()}</Text>
                                    <Text style={styles.emiName}>{emi.name}</Text>
                                </View>
                                <AmountDisplay amount={emi.amount} size="medium" style={{ color: '#4CAF50' }} />
                            </View>
                        ))
                    )}
                </View>

                <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
                    <Text style={styles.deleteButtonText}>Delete Debt Record</Text>
                </TouchableOpacity>
                <View style={{ height: 100 }} />
            </ScrollView>

            <TouchableOpacity
                style={styles.fab}
                onPress={() => setShowPaymentModal(true)}
            >
                <Ionicons name="cash-outline" size={28} color="#fff" />
                <Text style={styles.fabText}>Record Payment</Text>
            </TouchableOpacity>

            <Modal visible={showPaymentModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Record Payment</Text>
                        <TextInput
                            style={styles.input}
                            value={paymentAmount}
                            onChangeText={setPaymentAmount}
                            placeholder="Amount"
                            keyboardType="decimal-pad"
                            autoFocus
                        />
                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.cancelButton]}
                                onPress={() => setShowPaymentModal(false)}
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.confirmButton]}
                                onPress={handleAddPayment}
                            >
                                <Text style={styles.confirmButtonText}>Save</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    content: {
        padding: 16,
    },
    headerCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
        shadowColor: '#000',
        elevation: 2,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 4,
    },
    creditor: {
        fontSize: 16,
        color: '#666',
        marginBottom: 20,
    },
    progressSection: {
        marginBottom: 16,
    },
    amountRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    label: {
        fontSize: 12,
        color: '#999',
        marginBottom: 4,
    },
    amount: {
        color: '#D32F2F',
    },
    progressBarBg: {
        height: 10,
        backgroundColor: '#f0f0f0',
        borderRadius: 5,
        overflow: 'hidden',
        marginBottom: 8,
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#4CAF50',
    },
    progressText: {
        textAlign: 'right',
        color: '#666',
        fontSize: 12,
    },
    notes: {
        marginTop: 10,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        color: '#666',
        fontStyle: 'italic',
    },
    historySection: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 12,
    },
    emptyText: {
        color: '#999',
        fontStyle: 'italic',
    },
    emiItem: {
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 12,
        marginBottom: 8,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    emiDate: {
        fontSize: 14,
        color: '#666',
    },
    emiName: {
        fontSize: 12,
        color: '#999',
    },
    deleteButton: {
        padding: 16,
        alignItems: 'center',
    },
    deleteButtonText: {
        color: '#D32F2F',
        fontWeight: '600',
    },
    fab: {
        position: 'absolute',
        bottom: 24,
        alignSelf: 'center',
        backgroundColor: '#007AFF',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 28,
        flexDirection: 'row',
        alignItems: 'center',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        gap: 8,
    },
    fabText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: '#fff',
        padding: 24,
        borderRadius: 16,
        width: '80%',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 16,
        textAlign: 'center',
    },
    input: {
        backgroundColor: '#f9f9f9',
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ddd',
        fontSize: 18,
        marginBottom: 20,
        textAlign: 'center',
    },
    modalButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    modalButton: {
        flex: 1,
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: '#f5f5f5',
    },
    confirmButton: {
        backgroundColor: '#007AFF',
    },
    cancelButtonText: {
        color: '#333',
        fontWeight: '600',
    },
    confirmButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
});
