import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Switch, TextInput, Modal } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { settingsService, BankAccount } from '../../services/settings.service';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../contexts/ThemeContext';
import { GlassHeader } from '../../components/GlassHeader';
import { GlassCard } from '../../components/GlassCard';
import * as Crypto from 'expo-crypto';

export const AccountSettingsScreen = () => {
    const navigation = useNavigation();
    const { theme } = useTheme();
    const [biometricsEnabled, setBiometricsEnabled] = useState(false);
    const [isBiometricSupported, setIsBiometricSupported] = useState(false);

    // Bank Accounts
    const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
    const [showAddAccount, setShowAddAccount] = useState(false);
    const [newAccName, setNewAccName] = useState('');
    const [newAccBank, setNewAccBank] = useState('');
    const [newAccLast4, setNewAccLast4] = useState('');

    // Bank Identifiers
    const [identifiers, setIdentifiers] = useState<string[]>([]);
    const [showAddIdentifier, setShowAddIdentifier] = useState(false);
    const [newIdentifier, setNewIdentifier] = useState('');

    useEffect(() => {
        checkBiometrics();
        loadSettings();
        loadAccountData();
    }, []);

    const checkBiometrics = async () => {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();
        setIsBiometricSupported(hasHardware && isEnrolled);
    };

    const loadSettings = async () => {
        const val = await AsyncStorage.getItem('@biometrics_enabled');
        setBiometricsEnabled(val === 'true');
    };

    const loadAccountData = async () => {
        const settings = await settingsService.getAccountSettings();
        setBankAccounts(settings.bankAccounts || []);
        setIdentifiers(settings.customBankIdentifiers || []);
    };

    const toggleBiometrics = async (value: boolean) => {
        if (value) {
            const result = await LocalAuthentication.authenticateAsync({
                promptMessage: 'Authenticate to enable biometrics',
            });
            if (result.success) {
                await AsyncStorage.setItem('@biometrics_enabled', 'true');
                setBiometricsEnabled(true);
            }
        } else {
            await AsyncStorage.setItem('@biometrics_enabled', 'false');
            setBiometricsEnabled(false);
        }
    };

    const handleChangePassword = () => {
        Alert.alert('Coming Soon', 'Change password functionality will be added soon.');
    };

    const handleDeleteAccount = () => {
        Alert.alert(
            'Delete Account',
            'Are you sure? This will delete ALL your data permanently.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        await AsyncStorage.clear();
                        Alert.alert('Success', 'Account data deleted. Please restart the app.');
                    }
                }
            ]
        );
    };

    // ── Bank Account CRUD ──
    const handleAddBankAccount = async () => {
        if (!newAccName.trim()) { Alert.alert('Error', 'Account name is required'); return; }
        if (!newAccLast4.trim() || newAccLast4.length < 3 || newAccLast4.length > 4) {
            Alert.alert('Error', 'Enter last 3-4 digits of account number'); return;
        }

        const newAccount: BankAccount = {
            id: Crypto.randomUUID(),
            name: newAccName.trim(),
            bankName: newAccBank.trim() || newAccName.trim(),
            last4: newAccLast4.trim(),
        };

        const settings = await settingsService.getAccountSettings();
        settings.bankAccounts = [...(settings.bankAccounts || []), newAccount];
        // Also add to the accounts list if not already there
        if (!settings.accounts.includes(newAccount.name)) {
            settings.accounts.push(newAccount.name);
        }
        await settingsService.saveAccountSettings(settings);
        setBankAccounts(settings.bankAccounts);
        setShowAddAccount(false);
        setNewAccName(''); setNewAccBank(''); setNewAccLast4('');
    };

    const handleDeleteBankAccount = (id: string, name: string) => {
        Alert.alert('Remove Account', `Remove "${name}"?`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Remove', style: 'destructive',
                onPress: async () => {
                    const settings = await settingsService.getAccountSettings();
                    settings.bankAccounts = (settings.bankAccounts || []).filter(a => a.id !== id);
                    await settingsService.saveAccountSettings(settings);
                    setBankAccounts(settings.bankAccounts);
                }
            },
        ]);
    };

    // ── Bank Identifier CRUD ──
    const handleAddIdentifier = async () => {
        if (!newIdentifier.trim() || newIdentifier.trim().length < 2) {
            Alert.alert('Error', 'Enter at least 2 characters (e.g., HDFC, SBI, FEDERAL)'); return;
        }
        const id = newIdentifier.trim().toUpperCase();
        const settings = await settingsService.getAccountSettings();
        if ((settings.customBankIdentifiers || []).includes(id)) {
            Alert.alert('Exists', `"${id}" is already added`); return;
        }
        settings.customBankIdentifiers = [...(settings.customBankIdentifiers || []), id];
        await settingsService.saveAccountSettings(settings);
        setIdentifiers(settings.customBankIdentifiers);
        setShowAddIdentifier(false);
        setNewIdentifier('');
    };

    const handleDeleteIdentifier = async (id: string) => {
        const settings = await settingsService.getAccountSettings();
        settings.customBankIdentifiers = (settings.customBankIdentifiers || []).filter(i => i !== id);
        await settingsService.saveAccountSettings(settings);
        setIdentifiers(settings.customBankIdentifiers);
    };

    const BUILT_IN_IDENTIFIERS = [
        'SBI', 'HDFC', 'ICICI', 'AXIS', 'KOTAK', 'PAYTM', 'GPAY', 'AMZ',
        'BOB', 'PNB', 'UBI', 'CITI', 'YES', 'IDBI', 'INDUS', 'RBL',
        'FEDERAL', 'CANARA', 'UNION', 'BAJAJ'
    ];

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <GlassHeader title="Account Settings" showBack onBack={() => navigation.goBack()} />
            <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 120, paddingTop: 100 }}>

                {/* ─── Bank Accounts Section ─── */}
                <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>BANK ACCOUNTS</Text>
                <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
                    <Text style={[styles.sectionHint, { color: theme.colors.textSecondary }]}>
                        Add your bank accounts with last 4 digits. SMS transactions will be auto-mapped to matching accounts.
                    </Text>

                    {bankAccounts.map((acc) => (
                        <View key={acc.id} style={[styles.accountRow, { borderBottomColor: theme.colors.border }]}>
                            <View style={[styles.accountIcon, { backgroundColor: theme.colors.primary + '15' }]}>
                                <Ionicons name="business-outline" size={20} color={theme.colors.primary} />
                            </View>
                            <View style={{ flex: 1, marginLeft: 12 }}>
                                <Text style={[styles.accountName, { color: theme.colors.text }]}>{acc.name}</Text>
                                <Text style={[styles.accountMeta, { color: theme.colors.textSecondary }]}>
                                    {acc.bankName} • ••••{acc.last4}
                                </Text>
                            </View>
                            <TouchableOpacity onPress={() => handleDeleteBankAccount(acc.id, acc.name)}>
                                <Ionicons name="trash-outline" size={18} color={theme.colors.error} />
                            </TouchableOpacity>
                        </View>
                    ))}

                    <TouchableOpacity
                        style={[styles.addButton, { borderColor: theme.colors.primary }]}
                        onPress={() => setShowAddAccount(true)}
                    >
                        <Ionicons name="add-circle-outline" size={20} color={theme.colors.primary} />
                        <Text style={[styles.addButtonText, { color: theme.colors.primary }]}>Add Bank Account</Text>
                    </TouchableOpacity>
                </View>

                {/* ─── SMS Bank Identifiers ─── */}
                <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>SMS BANK IDENTIFIERS</Text>
                <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
                    <Text style={[styles.sectionHint, { color: theme.colors.textSecondary }]}>
                        These keywords help identify bank SMS senders. Built-in identifiers are always active. Add your own if your bank isn't recognized.
                    </Text>

                    <Text style={[styles.subLabel, { color: theme.colors.text }]}>Built-in</Text>
                    <View style={styles.chipGrid}>
                        {BUILT_IN_IDENTIFIERS.map((id) => (
                            <View key={id} style={[styles.chip, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                                <Text style={[styles.chipText, { color: theme.colors.textSecondary }]}>{id}</Text>
                            </View>
                        ))}
                    </View>

                    {identifiers.length > 0 && (
                        <>
                            <Text style={[styles.subLabel, { color: theme.colors.text, marginTop: 12 }]}>Custom</Text>
                            <View style={styles.chipGrid}>
                                {identifiers.map((id) => (
                                    <TouchableOpacity
                                        key={id}
                                        style={[styles.chip, styles.customChip, { backgroundColor: theme.colors.primary + '15', borderColor: theme.colors.primary }]}
                                        onLongPress={() => handleDeleteIdentifier(id)}
                                    >
                                        <Text style={[styles.chipText, { color: theme.colors.primary }]}>{id}</Text>
                                        <Ionicons name="close-circle" size={14} color={theme.colors.primary} style={{ marginLeft: 4 }} />
                                    </TouchableOpacity>
                                ))}
                            </View>
                            <Text style={[styles.chipHint, { color: theme.colors.textSecondary }]}>Long-press to remove</Text>
                        </>
                    )}

                    <TouchableOpacity
                        style={[styles.addButton, { borderColor: theme.colors.primary }]}
                        onPress={() => setShowAddIdentifier(true)}
                    >
                        <Ionicons name="add-circle-outline" size={20} color={theme.colors.primary} />
                        <Text style={[styles.addButtonText, { color: theme.colors.primary }]}>Add Identifier</Text>
                    </TouchableOpacity>
                </View>

                {/* ─── Security Section ─── */}
                <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>SECURITY</Text>
                <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
                    {isBiometricSupported && (
                        <View style={[styles.settingRow, { borderBottomColor: theme.colors.border }]}>
                            <View>
                                <Text style={[styles.settingLabel, { color: theme.colors.text }]}>Biometrics</Text>
                                <Text style={[styles.settingDesc, { color: theme.colors.textSecondary }]}>FaceID / TouchID</Text>
                            </View>
                            <Switch
                                value={biometricsEnabled}
                                onValueChange={toggleBiometrics}
                                trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                                thumbColor={theme.colors.buttonText}
                            />
                        </View>
                    )}
                    <TouchableOpacity style={styles.settingRow} onPress={handleChangePassword}>
                        <View>
                            <Text style={[styles.settingLabel, { color: theme.colors.text }]}>Change Password</Text>
                            <Text style={[styles.settingDesc, { color: theme.colors.textSecondary }]}>Update master password</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={24} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                </View>

                {/* ─── Danger Zone ─── */}
                <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
                    <Text style={[styles.dangerTitle, { color: theme.colors.error }]}>Danger Zone</Text>
                    <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteAccount}>
                        <Ionicons name="trash-outline" size={24} color={theme.colors.error} />
                        <Text style={[styles.deleteText, { color: theme.colors.error }]}>Delete Account & Data</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>

            {/* ─── Add Bank Account Modal ─── */}
            <Modal visible={showAddAccount} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <GlassCard style={styles.modalContent}>
                        <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Add Bank Account</Text>

                        <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>Account Name</Text>
                        <TextInput
                            style={[styles.modalInput, { backgroundColor: theme.colors.surface, color: theme.colors.text, borderColor: theme.colors.border }]}
                            value={newAccName} onChangeText={setNewAccName}
                            placeholder="e.g., HDFC Savings" placeholderTextColor={theme.colors.textSecondary}
                        />

                        <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>Bank Name</Text>
                        <TextInput
                            style={[styles.modalInput, { backgroundColor: theme.colors.surface, color: theme.colors.text, borderColor: theme.colors.border }]}
                            value={newAccBank} onChangeText={setNewAccBank}
                            placeholder="e.g., HDFC" placeholderTextColor={theme.colors.textSecondary}
                        />

                        <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>Last 4 Digits of Account</Text>
                        <TextInput
                            style={[styles.modalInput, { backgroundColor: theme.colors.surface, color: theme.colors.text, borderColor: theme.colors.border }]}
                            value={newAccLast4} onChangeText={(t) => setNewAccLast4(t.replace(/\D/g, '').slice(0, 4))}
                            placeholder="e.g., 7845" placeholderTextColor={theme.colors.textSecondary}
                            keyboardType="number-pad" maxLength={4}
                        />

                        <View style={styles.modalActions}>
                            <TouchableOpacity style={[styles.modalBtn, { backgroundColor: theme.colors.surface }]} onPress={() => setShowAddAccount(false)}>
                                <Text style={[styles.modalBtnText, { color: theme.colors.text }]}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.modalBtn, { backgroundColor: theme.colors.primary }]} onPress={handleAddBankAccount}>
                                <Text style={[styles.modalBtnText, { color: '#FFF' }]}>Add</Text>
                            </TouchableOpacity>
                        </View>
                    </GlassCard>
                </View>
            </Modal>

            {/* ─── Add Identifier Modal ─── */}
            <Modal visible={showAddIdentifier} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <GlassCard style={styles.modalContent}>
                        <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Add Bank Identifier</Text>
                        <Text style={[styles.modalHint, { color: theme.colors.textSecondary }]}>
                            Enter a keyword found in SMS sender IDs from your bank (e.g., "AUBANK", "INDLBK", "JKBANK").
                        </Text>

                        <TextInput
                            style={[styles.modalInput, { backgroundColor: theme.colors.surface, color: theme.colors.text, borderColor: theme.colors.border }]}
                            value={newIdentifier} onChangeText={setNewIdentifier}
                            placeholder="e.g., AUBANK" placeholderTextColor={theme.colors.textSecondary}
                            autoCapitalize="characters"
                        />

                        <View style={styles.modalActions}>
                            <TouchableOpacity style={[styles.modalBtn, { backgroundColor: theme.colors.surface }]} onPress={() => setShowAddIdentifier(false)}>
                                <Text style={[styles.modalBtnText, { color: theme.colors.text }]}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.modalBtn, { backgroundColor: theme.colors.primary }]} onPress={handleAddIdentifier}>
                                <Text style={[styles.modalBtnText, { color: '#FFF' }]}>Add</Text>
                            </TouchableOpacity>
                        </View>
                    </GlassCard>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: { flex: 1, padding: 16 },
    sectionLabel: { fontSize: 12, fontWeight: 'bold', marginTop: 20, marginBottom: 8, letterSpacing: 1 },
    section: {
        borderRadius: 12, padding: 16, marginBottom: 8,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1, shadowRadius: 4, elevation: 2,
    },
    sectionHint: { fontSize: 13, lineHeight: 18, marginBottom: 12 },
    subLabel: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
    // Bank Account rows
    accountRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },
    accountIcon: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
    accountName: { fontSize: 15, fontWeight: '600' },
    accountMeta: { fontSize: 12, marginTop: 2 },
    // Chips
    chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16, borderWidth: 1 },
    customChip: { flexDirection: 'row', alignItems: 'center' },
    chipText: { fontSize: 12, fontWeight: '500' },
    chipHint: { fontSize: 11, marginTop: 6, fontStyle: 'italic' },
    // Add button
    addButton: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 6, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderStyle: 'dashed', marginTop: 12,
    },
    addButtonText: { fontSize: 14, fontWeight: '600' },
    // Settings row
    settingRow: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'transparent',
    },
    settingLabel: { fontSize: 15, fontWeight: '500' },
    settingDesc: { fontSize: 13, marginTop: 2 },
    // Danger
    dangerTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
    deleteButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, gap: 8 },
    deleteText: { fontSize: 15, fontWeight: 'bold' },
    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
    modalContent: { padding: 24, borderRadius: 20 },
    modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
    modalHint: { fontSize: 13, lineHeight: 18, marginBottom: 12 },
    inputLabel: { fontSize: 12, fontWeight: '600', marginBottom: 4, marginTop: 8 },
    modalInput: { padding: 12, borderRadius: 10, borderWidth: 1, fontSize: 15 },
    modalActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
    modalBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
    modalBtnText: { fontSize: 15, fontWeight: '600' },
});
