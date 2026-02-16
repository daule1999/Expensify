import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Switch, Modal, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';

import { settingsService, PrivacySettings, ProfileSettings } from '../../services/settings.service';
import { transactionService } from '../../services/transaction.service';
import { exportService } from '../../services/export.service';
import { importService } from '../../services/import.service';
import { smsService } from '../../services/sms.service';
import { testService } from '../../services/test.service';

import { usePrivacy } from '../../contexts/PrivacyContext';
import { useTheme } from '../../contexts/ThemeContext';
import { GOOGLE_AUTH_CONFIG } from '../../config/auth';

import { GlassHeader } from '../../components/GlassHeader';
import { GlassCard } from '../../components/GlassCard';
import { GlassInput } from '../../components/GlassInput';

WebBrowser.maybeCompleteAuthSession();

export const SettingsScreen = () => {
    const navigation = useNavigation();
    const { refreshSettings } = usePrivacy();
    const { theme, isDark, toggleTheme } = useTheme();

    const [activeSection, setActiveSection] = useState<'main' | 'privacy' | 'data' | 'automation' | 'about'>('main');

    // === Global Settings State ===
    const [privacySettings, setPrivacySettings] = useState<PrivacySettings | null>(null);
    const [profileSettings, setProfileSettings] = useState<ProfileSettings | null>(null);
    const [isSyncing, setIsSyncing] = useState(false);

    // === Test Runner State ===
    const [testResults, setTestResults] = useState<any[]>([]);
    const [isRunningTests, setIsRunningTests] = useState(false);
    const [showTestModal, setShowTestModal] = useState(false);

    // === Google Auth State ===
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const [clientIds, setClientIds] = useState({
        web: GOOGLE_AUTH_CONFIG.webClientId,
        ios: GOOGLE_AUTH_CONFIG.iosClientId,
        android: GOOGLE_AUTH_CONFIG.androidClientId,
    });
    const [showConfigModal, setShowConfigModal] = useState(false);
    const [tempClientIds, setTempClientIds] = useState(clientIds);

    const [request, response, promptAsync] = Google.useAuthRequest({
        androidClientId: clientIds.android,
        iosClientId: clientIds.ios,
        webClientId: clientIds.web,
        scopes: GOOGLE_AUTH_CONFIG.scopes,
    });

    useEffect(() => {
        if (response?.type === 'success') {
            setAccessToken(response.authentication?.accessToken || null);
            Alert.alert('Success', 'Connected to Google Drive!');
        } else if (response?.type === 'error') {
            Alert.alert('Auth Error', 'Failed to sign in to Google.');
        }
    }, [response]);

    useEffect(() => {
        loadSettings();
        loadClientIds();
    }, []);

    const loadSettings = async () => {
        const privacy = await settingsService.getPrivacySettings();
        const profile = await settingsService.getProfileSettings();
        setPrivacySettings(privacy);
        setProfileSettings(profile);
    };

    const loadClientIds = async () => {
        try {
            const saved = await AsyncStorage.getItem('google_client_ids');
            if (saved) {
                const parsed = JSON.parse(saved);
                setClientIds(parsed);
                setTempClientIds(parsed);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const runSelfTest = async () => {
        setIsRunningTests(true);
        setShowTestModal(true);
        setTestResults([]); // Clear previous

        try {
            const results = await testService.runAllTests();
            setTestResults(results);
        } catch (e) {
            Alert.alert('Error', 'Test suite failed to run');
        } finally {
            setIsRunningTests(false);
        }
    };

    // === Handlers (Condensed for clarity) ===
    const handleUpdateProfile = async (field: keyof ProfileSettings, value: string) => {
        if (!profileSettings) return;
        const updated = { ...profileSettings, [field]: value };
        setProfileSettings(updated);
        await settingsService.saveProfileSettings(updated);
    };

    const handleToggleHideAmounts = async (value: boolean) => {
        if (!privacySettings) return;
        const updated = { ...privacySettings, hideAmounts: value };
        setPrivacySettings(updated);
        await settingsService.savePrivacySettings(updated);
        await refreshSettings();
    };

    const handleExport = async () => {
        Alert.alert('Export', 'Choose format', [
            {
                text: 'CSV', onPress: async () => {
                    try {
                        await exportService.exportToCSV(await transactionService.getAll());
                    } catch (e: any) { Alert.alert('Error', e.message); }
                }
            },
            {
                text: 'JSON', onPress: async () => {
                    try {
                        await exportService.exportToJSON(await transactionService.getAll());
                    } catch (e: any) { Alert.alert('Error', e.message); }
                }
            },
            { text: 'Cancel', style: 'cancel' }
        ]);
    };

    const handleImport = async () => {
        try {
            const result = await importService.pickDocument();
            if (result.canceled) return;
            const uri = result.assets[0].uri;
            const name = result.assets[0].name || '';

            let transactions;
            if (name.toLowerCase().endsWith('.csv')) {
                transactions = await importService.readCSVFile(uri);
            } else {
                transactions = await importService.readJSONFile(uri);
            }

            const count = await transactionService.importTransactions(transactions);
            Alert.alert('Success', `Imported ${count} transactions successfully`);
        } catch (e: any) {
            Alert.alert('Error', e.message || 'Import failed');
        }
    };

    const saveClientIds = async () => {
        await AsyncStorage.setItem('google_client_ids', JSON.stringify(tempClientIds));
        setClientIds(tempClientIds);
        setShowConfigModal(false);
    };


    // === Render Helpers for Sections ===

    const renderMainProfileCard = () => (
        <GlassCard style={styles.card}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                <View style={[styles.avatarPlaceholder, { backgroundColor: theme.colors.primary }]}>
                    <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#FFF' }}>
                        {profileSettings?.name?.charAt(0) || 'U'}
                    </Text>
                </View>
                <View style={{ marginLeft: 16, flex: 1 }}>
                    <GlassInput
                        value={profileSettings?.name || ''}
                        onChangeText={(t) => handleUpdateProfile('name', t)}
                        placeholder="Your Name"
                        style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 4, height: 40 }}
                    />
                    <Text style={{ color: theme.colors.textSecondary }}>{profileSettings?.email || 'No email set'}</Text>
                </View>
            </View>
        </GlassCard>
    );

    const renderMenuItem = (icon: string, title: string, subtitle: string, onPress: () => void, color?: string) => (
        <TouchableOpacity style={styles.menuItem} onPress={onPress}>
            <View style={[styles.iconContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
                <Ionicons name={icon as any} size={22} color={color || theme.colors.primary} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.menuTitle, { color: theme.colors.text }]}>{title}</Text>
                <Text style={[styles.menuSubtitle, { color: theme.colors.textSecondary }]}>{subtitle}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>
    );

    const renderPrivacySection = () => (
        <View>
            <TouchableOpacity onPress={() => setActiveSection('main')} style={styles.backButton}>
                <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
                <Text style={[styles.backText, { color: theme.colors.text }]}>Back to Settings</Text>
            </TouchableOpacity>

            <Text style={[styles.sectionHeader, { color: theme.colors.text }]}>Privacy & Security</Text>
            <GlassCard style={styles.card}>
                <View style={styles.settingRow}>
                    <Text style={{ color: theme.colors.text, flex: 1 }}>Hide Amounts (****)</Text>
                    <Switch
                        value={privacySettings?.hideAmounts}
                        onValueChange={handleToggleHideAmounts}
                        trackColor={{ true: theme.colors.primary, false: theme.colors.border }}
                    />
                </View>
                <View style={styles.divider} />
                <View style={styles.settingRow}>
                    <Text style={{ color: theme.colors.text, flex: 1 }}>Biometric Unlock</Text>
                    <Switch
                        value={privacySettings?.useBiometric}
                        onValueChange={(v) => {
                            if (privacySettings) {
                                const updated = { ...privacySettings, useBiometric: v };
                                setPrivacySettings(updated);
                                settingsService.savePrivacySettings(updated);
                            }
                        }}
                        trackColor={{ true: theme.colors.primary, false: theme.colors.border }}
                    />
                </View>
            </GlassCard>
        </View>
    );

    const renderAboutSection = () => (
        <View>
            <TouchableOpacity onPress={() => setActiveSection('main')} style={styles.backButton}>
                <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
                <Text style={[styles.backText, { color: theme.colors.text }]}>Back to Settings</Text>
            </TouchableOpacity>

            <Text style={[styles.sectionHeader, { color: theme.colors.text }]}>About & Help</Text>

            <GlassCard style={styles.card}>
                <Text style={[styles.aboutText, { color: theme.colors.text }]}>
                    <Text style={{ fontWeight: 'bold' }}>Expensify v1.0.0</Text>{'\n'}
                    Offline-First Expense Tracker
                </Text>
                <Text style={[styles.aboutText, { color: theme.colors.textSecondary, marginTop: 10 }]}>
                    • Transactions are stored locally on your device.{'\n'}
                    • Backups are encrypted with AES-256.{'\n'}
                    • SMS processing happens strictly on-device.
                </Text>
            </GlassCard>

            <Text style={[styles.sectionHeader, { color: theme.colors.text, fontSize: 16, marginTop: 20 }]}>Diagnostics</Text>
            <GlassCard style={styles.card}>
                <TouchableOpacity style={styles.testButton} onPress={runSelfTest}>
                    <Ionicons name="pulse" size={24} color="#FFF" />
                    <Text style={{ color: '#FFF', fontWeight: 'bold', marginLeft: 8 }}>Run Health Check</Text>
                </TouchableOpacity>
                <Text style={{ color: theme.colors.textSecondary, fontSize: 12, marginTop: 8, textAlign: 'center' }}>
                    Tests database integrity, encryption, and SMS logic.
                </Text>
            </GlassCard>
        </View>
    );

    // === Main Render ===
    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <LinearGradient
                colors={isDark ? ['#1A0033', '#000000'] : ['#E0EAFC', '#CFDEF3']}
                style={StyleSheet.absoluteFill}
            />

            <GlassHeader title="Settings" showBack={activeSection !== 'main'} onBack={() => setActiveSection('main')} />

            <ScrollView contentContainerStyle={styles.content}>

                {activeSection === 'main' && (
                    <>
                        {renderMainProfileCard()}

                        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Preferences</Text>
                        <GlassCard style={styles.card}>
                            {renderMenuItem('moon-outline', 'Appearance', isDark ? 'Dark Mode' : 'Light Mode', toggleTheme)}
                            <View style={styles.divider} />
                            {renderMenuItem('wallet-outline', 'Accounts', 'Bank accounts, UPI, Cash', () => navigation.navigate('AccountSettings' as never))}
                            <View style={styles.divider} />
                            {renderMenuItem('pie-chart-outline', 'Budgets', 'Set spending limits', () => navigation.navigate('Budgets' as never))}
                            <View style={styles.divider} />
                            {renderMenuItem('shield-checkmark-outline', 'Privacy & Security', 'Biometrics, App Lock', () => setActiveSection('privacy'))}
                        </GlassCard>

                        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Data</Text>
                        <GlassCard style={styles.card}>
                            {renderMenuItem('cloud-upload-outline', 'Backup & Restore', 'Google Drive / Local', () => setShowConfigModal(true))}
                            <View style={styles.divider} />
                            {renderMenuItem('download-outline', 'Export Data', 'CSV / JSON', handleExport)}
                            <View style={styles.divider} />
                            {renderMenuItem('exit-outline', 'Import Data', 'CSV / JSON', handleImport)}
                        </GlassCard>

                        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Automation</Text>
                        <GlassCard style={styles.card}>
                            {renderMenuItem('chatbubbles-outline', 'SMS Sync', 'Android Only', async () => {
                                // Quick SMS Sync trigger
                                try {
                                    setIsSyncing(true);
                                    await smsService.syncAllTransactions();
                                    Alert.alert('Synced', 'SMS transactions updated');
                                } catch (e) { Alert.alert('Error', 'Sync failed'); }
                                finally { setIsSyncing(false); }
                            })}
                            <View style={styles.divider} />
                            {renderMenuItem('repeat-outline', 'Recurring', 'Auto-create transactions', () => navigation.navigate('Recurring' as never))}
                        </GlassCard>

                        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Other</Text>
                        <GlassCard style={styles.card}>
                            {renderMenuItem('information-circle-outline', 'About & Help', 'Version, Diagnostics', () => setActiveSection('about'))}
                        </GlassCard>
                    </>
                )}

                {activeSection === 'privacy' && renderPrivacySection()}
                {activeSection === 'about' && renderAboutSection()}

                {/* Backup Config Modal (Simplified) */}
                <Modal visible={showConfigModal} transparent animationType="fade" onRequestClose={() => setShowConfigModal(false)}>
                    <View style={styles.modalOverlay}>
                        <GlassCard style={styles.modalContent}>
                            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Cloud Backup</Text>
                            <TouchableOpacity style={styles.modalButton} onPress={() => { promptAsync(); setShowConfigModal(false); }}>
                                <Text style={{ color: '#FFF' }}>Sign in with Google</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.modalButton, { backgroundColor: theme.colors.card, marginTop: 10 }]} onPress={() => setShowConfigModal(false)}>
                                <Text style={{ color: theme.colors.text }}>Cancel</Text>
                            </TouchableOpacity>
                        </GlassCard>
                    </View>
                </Modal>

                {/* Test Results Modal */}
                <Modal visible={showTestModal} transparent animationType="slide" onRequestClose={() => setShowTestModal(false)}>
                    <View style={styles.modalOverlay}>
                        <GlassCard style={[styles.modalContent, { maxHeight: '80%' }]}>
                            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>System Health Check</Text>

                            {isRunningTests ? (
                                <ActivityIndicator size="large" color={theme.colors.primary} />
                            ) : (
                                <ScrollView>
                                    {testResults.map((res, i) => (
                                        <View key={i} style={styles.testResultRow}>
                                            <Ionicons
                                                name={res.status === 'passed' ? 'checkmark-circle' : 'alert-circle'}
                                                size={24}
                                                color={res.status === 'passed' ? theme.colors.success : theme.colors.error}
                                            />
                                            <View style={{ marginLeft: 12, flex: 1 }}>
                                                <Text style={[styles.testName, { color: theme.colors.text }]}>{res.name}</Text>
                                                {res.message && <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>{res.message}</Text>}
                                            </View>
                                            {res.duration && <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>{res.duration}ms</Text>}
                                        </View>
                                    ))}
                                </ScrollView>
                            )}

                            <TouchableOpacity style={[styles.modalButton, { marginTop: 20 }]} onPress={() => setShowTestModal(false)}>
                                <Text style={{ color: '#FFF' }}>Close</Text>
                            </TouchableOpacity>
                        </GlassCard>
                    </View>
                </Modal>

            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: { padding: 16, paddingTop: 110, paddingBottom: 140 },
    sectionTitle: { fontSize: 14, fontWeight: 'bold', marginTop: 24, marginBottom: 8, opacity: 0.7, textTransform: 'uppercase' },
    card: { padding: 16, borderRadius: 16 },
    avatarPlaceholder: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
    menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
    iconContainer: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    menuTitle: { fontSize: 16, fontWeight: '600' },
    menuSubtitle: { fontSize: 12, marginTop: 2 },
    divider: { height: 1, backgroundColor: 'rgba(150,150,150,0.1)', marginVertical: 4 },
    // Sub-section styles
    backButton: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    backText: { fontSize: 16, marginLeft: 8, fontWeight: '600' },
    sectionHeader: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
    settingRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
    aboutText: { fontSize: 14, lineHeight: 22 },
    testButton: { backgroundColor: '#4CAF50', padding: 16, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
    modalContent: { padding: 24, borderRadius: 24 },
    modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
    modalButton: { backgroundColor: '#2196F3', padding: 14, borderRadius: 12, alignItems: 'center' },
    testResultRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(150,150,150,0.1)' },
    testName: { fontSize: 16, fontWeight: '500' },
});
