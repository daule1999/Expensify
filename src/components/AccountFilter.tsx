import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { settingsService } from '../services/settings.service';
import { useTheme } from '../contexts/ThemeContext';

interface AccountFilterProps {
    selectedAccount: string;
    onSelectAccount: (account: string) => void;
    showAllOption?: boolean;
}

export const AccountFilter: React.FC<AccountFilterProps> = ({
    selectedAccount,
    onSelectAccount,
    showAllOption = true
}) => {
    const { theme } = useTheme();
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
        if (account === 'All Accounts') return 'wallet-outline';
        if (account === 'Cash') return 'cash-outline';
        return 'card-outline';
    };

    const allAccounts = showAllOption ? ['All Accounts', ...accounts] : accounts;

    return (
        <View style={styles.container}>
            <TouchableOpacity
                style={[styles.filterButton, { backgroundColor: theme.colors.card }]}
                onPress={() => setShowModal(true)}
            >
                <Ionicons name={getAccountIcon(selectedAccount)} size={18} color={theme.colors.primary} />
                <Text style={[styles.filterText, { color: theme.colors.primary }]}>{selectedAccount}</Text>
                <Ionicons name="chevron-down" size={18} color={theme.colors.primary} />
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
                    <View style={[styles.modalContent, { backgroundColor: theme.colors.background }]}>
                        <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
                            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Filter by Account</Text>
                            <TouchableOpacity onPress={() => setShowModal(false)}>
                                <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.accountList}>
                            {allAccounts.map((account) => (
                                <TouchableOpacity
                                    key={account}
                                    style={[
                                        styles.accountItem,
                                        { backgroundColor: theme.colors.card },
                                        selectedAccount === account && { backgroundColor: theme.colors.primary + '20', borderColor: theme.colors.primary, borderWidth: 1 }
                                    ]}
                                    onPress={() => handleSelectAccount(account)}
                                >
                                    <View style={styles.accountInfo}>
                                        <Ionicons
                                            name={getAccountIcon(account)}
                                            size={24}
                                            color={selectedAccount === account ? theme.colors.primary : theme.colors.textSecondary}
                                        />
                                        <Text style={[
                                            styles.accountName,
                                            { color: theme.colors.text },
                                            selectedAccount === account && { color: theme.colors.primary, fontWeight: '600' }
                                        ]}>
                                            {account}
                                        </Text>
                                    </View>
                                    {selectedAccount === account && (
                                        <Ionicons name="checkmark-circle" size={24} color={theme.colors.primary} />
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
        marginBottom: 16,
    },
    filterButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        gap: 6,
        alignSelf: 'flex-start',
    },
    filterText: {
        fontSize: 14,
        fontWeight: '600',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
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
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
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
    },
    accountInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    accountName: {
        fontSize: 16,
    },
});
