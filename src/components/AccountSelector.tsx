import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { settingsService, AccountSettings } from '../services/settings.service';

interface AccountSelectorProps {
    selectedAccount: string;
    onSelectAccount: (account: string) => void;
    style?: any;
}

export const AccountSelector: React.FC<AccountSelectorProps> = ({
    selectedAccount,
    onSelectAccount,
    style
}) => {
    const [showModal, setShowModal] = useState(false);
    const [accounts, setAccounts] = useState<string[]>(['Cash']);

    useEffect(() => {
        loadAccounts();
    }, []);

    const loadAccounts = async () => {
        const settings = await settingsService.getAccountSettings();
        setAccounts(settings.accounts);
    };

    const handleSelectAccount = (account: string) => {
        onSelectAccount(account);
        setShowModal(false);
    };

    const getAccountIcon = (account: string) => {
        if (account === 'Cash') {
            return 'cash-outline';
        }
        return 'card-outline';
    };

    return (
        <View style={[styles.container, style]}>
            <TouchableOpacity
                style={styles.selector}
                onPress={() => setShowModal(true)}
            >
                <View style={styles.selectedAccount}>
                    <Ionicons name={getAccountIcon(selectedAccount)} size={20} color="#007AFF" />
                    <Text style={styles.selectedAccountText}>{selectedAccount}</Text>
                </View>
                <Ionicons name="chevron-down" size={20} color="#999" />
            </TouchableOpacity>

            <Modal
                visible={showModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowModal(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setShowModal(false)}
                >
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Select Account</Text>
                            <TouchableOpacity onPress={() => setShowModal(false)}>
                                <Ionicons name="close" size={24} color="#666" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.accountList}>
                            {accounts.map((account) => (
                                <TouchableOpacity
                                    key={account}
                                    style={[
                                        styles.accountItem,
                                        selectedAccount === account && styles.accountItemSelected
                                    ]}
                                    onPress={() => handleSelectAccount(account)}
                                >
                                    <View style={styles.accountInfo}>
                                        <Ionicons
                                            name={getAccountIcon(account)}
                                            size={24}
                                            color={selectedAccount === account ? '#007AFF' : '#666'}
                                        />
                                        <Text style={[
                                            styles.accountName,
                                            selectedAccount === account && styles.accountNameSelected
                                        ]}>
                                            {account}
                                        </Text>
                                    </View>
                                    {selectedAccount === account && (
                                        <Ionicons name="checkmark-circle" size={24} color="#007AFF" />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
    },
    selector: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 15,
        borderWidth: 1,
        borderColor: '#ddd',
    },
    selectedAccount: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    selectedAccountText: {
        fontSize: 16,
        color: '#333',
        fontWeight: '500',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '70%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    accountList: {
        padding: 16,
    },
    accountItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderRadius: 12,
        marginBottom: 8,
        backgroundColor: '#f8f8f8',
    },
    accountItemSelected: {
        backgroundColor: '#E3F2FD',
        borderWidth: 1,
        borderColor: '#007AFF',
    },
    accountInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    accountName: {
        fontSize: 16,
        color: '#333',
    },
    accountNameSelected: {
        color: '#007AFF',
        fontWeight: '600',
    },
});
