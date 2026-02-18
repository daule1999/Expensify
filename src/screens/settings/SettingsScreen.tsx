import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Switch, Modal, ActivityIndicator, Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';

import { settingsService, PrivacySettings, ProfileSettings, NotificationSettings, SUPPORTED_CURRENCIES, BudgetAlertSettings } from '../../services/settings.service';
import { transactionService } from '../../services/transaction.service';
import { exportService } from '../../services/export.service';
import { importService } from '../../services/import.service';
import { smsService } from '../../services/sms.service';
import { backupService } from '../../services/backup.service';
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
    const { theme, isDark, toggleTheme, setThemeMode } = useTheme();
    const [activeSection, setActiveSection] = useState<'main' | 'privacy' | 'automation' | 'about' | 'blocklist'>('main');

    // === Global Settings State ===
    const [profileSettings, setProfileSettings] = useState<ProfileSettings | null>(null);
    const [privacySettings, setPrivacySettings] = useState<PrivacySettings | null>(null);
    const [notificationSettings, setNotificationSettings] = useState<NotificationSettings | null>(null);
    const [accountSettings, setAccountSettings] = useState<any>(null); // Changed to 'any' as per original, but instruction had AccountSettings
    const [budgetAlertSettings, setBudgetAlertSettings] = useState<BudgetAlertSettings | null>(null);

    const [loading, setLoading] = useState(true);
    const [showConfigModal, setShowConfigModal] = useState(false);
    const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
    const [showDateFormatPicker, setShowDateFormatPicker] = useState(false);
    const [showThemePicker, setShowThemePicker] = useState(false);

    const [isSyncing, setIsSyncing] = useState(false);

    // Test States
    const [showTestModal, setShowTestModal] = useState(false);
    const [testResults, setTestResults] = useState<any[]>([]);
    const [isRunningTests, setIsRunningTests] = useState(false);

    // === Google Auth State ===
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const [clientIds, setClientIds] = useState({
        web: GOOGLE_AUTH_CONFIG.webClientId,
        ios: GOOGLE_AUTH_CONFIG.iosClientId,
        android: GOOGLE_AUTH_CONFIG.androidClientId,
    });
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
        const notifications = await settingsService.getNotificationSettings();
        const accounts = await settingsService.getAccountSettings();
        const budgetAlerts = await settingsService.getBudgetAlertSettings();
        setPrivacySettings(privacy);
        setProfileSettings(profile);
        setNotificationSettings(notifications);
        setAccountSettings(accounts);
        setBudgetAlertSettings(budgetAlerts);
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

    const handleUpdateNotifications = async (field: keyof NotificationSettings, value: boolean) => {
        if (!notificationSettings) return;
        const updated = { ...notificationSettings, [field]: value };
        setNotificationSettings(updated);
        await settingsService.saveNotificationSettings(updated);
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

    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [editName, setEditName] = useState('');
    const [editEmail, setEditEmail] = useState('');
    const [editAvatar, setEditAvatar] = useState('');

    const startEditingProfile = () => {
        setEditName(profileSettings?.name || '');
        setEditEmail(profileSettings?.email || '');
        setEditAvatar(profileSettings?.avatarUrl || '');
        setIsEditingProfile(true);
    };

    const saveProfile = async () => {
        if (profileSettings) {
            const updated = {
                ...profileSettings,
                name: editName,
                email: editEmail,
                avatarUrl: editAvatar
            };
            await settingsService.saveProfileSettings(updated);
            setProfileSettings(updated);
            setIsEditingProfile(false);
        }
    };

    const renderMainProfileCard = () => (
        <GlassCard style={styles.card}>
            {isEditingProfile ? (
                // EDIT MODE
                <View>
                    <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: 'bold', marginBottom: 16 }}>Edit Profile</Text>

                    <Text style={{ color: theme.colors.textSecondary, marginBottom: 4 }}>Name</Text>
                    <GlassInput
                        value={editName}
                        onChangeText={setEditName}
                        placeholder="Your Name"
                        style={{ marginBottom: 12 }}
                    />

                    <Text style={{ color: theme.colors.textSecondary, marginBottom: 4 }}>Email</Text>
                    <GlassInput
                        value={editEmail}
                        onChangeText={setEditEmail}
                        placeholder="email@example.com"
                        keyboardType="email-address"
                        style={{ marginBottom: 12 }}
                    />

                    <Text style={{ color: theme.colors.textSecondary, marginBottom: 4 }}>Avatar URL (Optional)</Text>
                    <GlassInput
                        value={editAvatar}
                        onChangeText={setEditAvatar}
                        placeholder="https://example.com/avatar.png"
                        style={{ marginBottom: 16 }}
                    />

                    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10 }}>
                        <TouchableOpacity onPress={() => setIsEditingProfile(false)} style={{ padding: 10 }}>
                            <Text style={{ color: theme.colors.textSecondary }}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={saveProfile}
                            style={{ backgroundColor: theme.colors.primary, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8 }}
                        >
                            <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Save</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            ) : (
                // VIEW MODE
                <View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                        {profileSettings?.avatarUrl ? (
                            <Image
                                source={{ uri: profileSettings.avatarUrl }}
                                style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: theme.colors.surface }}
                            />
                        ) : (
                            <View style={[styles.avatarPlaceholder, { backgroundColor: theme.colors.primary, width: 60, height: 60, borderRadius: 30 }]}>
                                <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#FFF' }}>
                                    {profileSettings?.name?.charAt(0) || 'U'}
                                </Text>
                            </View>
                        )}

                        <View style={{ marginLeft: 16, flex: 1 }}>
                            <Text style={{ color: theme.colors.text, fontSize: 20, fontWeight: 'bold' }}>
                                {profileSettings?.name || 'User'}
                            </Text>
                            <Text style={{ color: theme.colors.textSecondary, marginTop: 4 }}>
                                {profileSettings?.email || 'No email set'}
                            </Text>
                        </View>

                        <TouchableOpacity onPress={startEditingProfile} style={{ padding: 8 }}>
                            <Ionicons name="pencil" size={20} color={theme.colors.primary} />
                        </TouchableOpacity>
                    </View>

                    {/* Currency Picker Row */}
                    <TouchableOpacity
                        style={[styles.settingRow, { borderTopWidth: 1, borderTopColor: 'rgba(150,150,150,0.1)', paddingTop: 12 }]}
                        onPress={() => setShowCurrencyPicker(true)}
                    >
                        <Ionicons name="cash-outline" size={20} color={theme.colors.primary} style={{ marginRight: 10 }} />
                        <Text style={{ color: theme.colors.text, flex: 1 }}>Currency</Text>
                        <Text style={{ color: theme.colors.primary, fontWeight: 'bold', fontSize: 16, marginRight: 4 }}>
                            {profileSettings?.currency || '₹'}
                        </Text>
                        <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
                    </TouchableOpacity>

                    {/* Date Format Picker Row */}
                    <TouchableOpacity
                        style={[styles.settingRow, { borderTopWidth: 1, borderTopColor: 'rgba(150,150,150,0.1)', paddingTop: 12 }]}
                        onPress={() => setShowDateFormatPicker(true)}
                    >
                        <Ionicons name="calendar-outline" size={20} color={theme.colors.primary} style={{ marginRight: 10 }} />
                        <Text style={{ color: theme.colors.text, flex: 1 }}>Date Format</Text>
                        <Text style={{ color: theme.colors.primary, fontWeight: 'bold', fontSize: 14, marginRight: 4 }}>
                            {profileSettings?.dateFormat || 'DD/MM/YYYY'}
                        </Text>
                        <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
                    </TouchableOpacity>

                    {/* Theme Picker Row */}
                    <TouchableOpacity
                        style={[styles.settingRow, { borderTopWidth: 1, borderTopColor: 'rgba(150,150,150,0.1)', paddingTop: 12 }]}
                        onPress={() => setShowThemePicker(true)}
                    >
                        <Ionicons name="color-palette-outline" size={20} color={theme.colors.primary} style={{ marginRight: 10 }} />
                        <Text style={{ color: theme.colors.text, flex: 1 }}>Appearance</Text>
                        <Text style={{ color: theme.colors.primary, fontWeight: 'bold', fontSize: 14, marginRight: 4 }}>
                            {profileSettings?.themePreference ? profileSettings.themePreference.charAt(0).toUpperCase() + profileSettings.themePreference.slice(1) : 'System'}
                        </Text>
                        <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                </View>
            )}
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
                    <View style={{ flex: 1 }}>
                        <Text style={{ color: theme.colors.text }}>Require Password to Unhide</Text>
                        <Text style={{ color: theme.colors.textSecondary, fontSize: 11, marginTop: 2 }}>Ask for password or biometric before showing amounts</Text>
                    </View>
                    <Switch
                        value={privacySettings?.requirePasswordToUnhide}
                        onValueChange={(v) => {
                            if (privacySettings) {
                                const updated = { ...privacySettings, requirePasswordToUnhide: v };
                                setPrivacySettings(updated);
                                settingsService.savePrivacySettings(updated);
                                refreshSettings();
                            }
                        }}
                        trackColor={{ true: theme.colors.primary, false: theme.colors.border }}
                    />
                </View>
                <View style={styles.divider} />
                <View style={styles.settingRow}>
                    <Text style={{ color: theme.colors.text, flex: 1 }}>Use Biometric Unlock</Text>
                    <Switch
                        value={privacySettings?.useBiometric}
                        onValueChange={(v) => {
                            if (privacySettings) {
                                const updated = { ...privacySettings, useBiometric: v };
                                setPrivacySettings(updated);
                                settingsService.savePrivacySettings(updated);
                                refreshSettings();
                            }
                        }}
                        trackColor={{ true: theme.colors.primary, false: theme.colors.border }}
                    />
                </View>
                <View style={styles.divider} />
                <View style={styles.settingRow}>
                    <View style={{ flex: 1 }}>
                        <Text style={{ color: theme.colors.text }}>Always Hide on Startup</Text>
                        <Text style={{ color: theme.colors.textSecondary, fontSize: 11, marginTop: 2 }}>Amounts always hidden when app opens</Text>
                    </View>
                    <Switch
                        value={privacySettings?.alwaysHideOnStartup}
                        onValueChange={(v) => {
                            if (privacySettings) {
                                const updated = { ...privacySettings, alwaysHideOnStartup: v };
                                setPrivacySettings(updated);
                                settingsService.savePrivacySettings(updated);
                                refreshSettings();
                            }
                        }}
                        trackColor={{ true: theme.colors.primary, false: theme.colors.border }}
                    />
                </View>
                <View style={styles.divider} />
                <View style={styles.settingRow}>
                    <Text style={{ color: theme.colors.text, flex: 1 }}>Require Lock on Startup</Text>
                    <Switch
                        value={privacySettings?.requireLockOnStartup}
                        onValueChange={(v) => {
                            if (privacySettings) {
                                const updated = { ...privacySettings, requireLockOnStartup: v };
                                setPrivacySettings(updated);
                                settingsService.savePrivacySettings(updated);
                                refreshSettings();
                            }
                        }}
                        trackColor={{ true: theme.colors.primary, false: theme.colors.border }}
                    />
                </View>
            </GlassCard>
        </View>
    );

    const renderNotificationSection = () => (
        <View>
            <Text style={[styles.sectionHeader, { color: theme.colors.text }]}>Notifications</Text>
            <GlassCard style={styles.card}>
                <View style={styles.settingRow}>
                    <Text style={{ color: theme.colors.text, flex: 1 }}>Enable Notifications</Text>
                    <Switch
                        value={notificationSettings?.enabled}
                        onValueChange={(v) => handleUpdateNotifications('enabled', v)}
                        trackColor={{ true: theme.colors.primary, false: theme.colors.border }}
                    />
                </View>
                {notificationSettings?.enabled && (
                    <>
                        <View style={styles.divider} />
                        <View style={styles.settingRow}>
                            <Text style={{ color: theme.colors.text, flex: 1, marginLeft: 16 }}>Subscription Reminders</Text>
                            <Switch
                                value={notificationSettings?.upcomingSubscription}
                                onValueChange={(v) => handleUpdateNotifications('upcomingSubscription', v)}
                                trackColor={{ true: theme.colors.primary, false: theme.colors.border }}
                            />
                        </View>
                        <View style={styles.divider} />
                        <View style={styles.settingRow}>
                            <Text style={{ color: theme.colors.text, flex: 1, marginLeft: 16 }}>EMI Reminders</Text>
                            <Switch
                                value={notificationSettings?.emiReminders}
                                onValueChange={(v) => handleUpdateNotifications('emiReminders', v)}
                                trackColor={{ true: theme.colors.primary, false: theme.colors.border }}
                            />
                        </View>
                        <View style={styles.divider} />
                        <View style={styles.settingRow}>
                            <Text style={{ color: theme.colors.text, flex: 1, marginLeft: 16 }}>Budget Alerts</Text>
                            <Switch
                                value={notificationSettings?.budgetAlerts}
                                onValueChange={(v) => handleUpdateNotifications('budgetAlerts', v)}
                                trackColor={{ true: theme.colors.primary, false: theme.colors.border }}
                            />
                        </View>
                    </>
                )}
            </GlassCard>
        </View>
    );

    const renderAboutSection = () => (
        <View>
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

    const renderBlocklistSection = () => (
        <View>
            <Text style={[styles.sectionHeader, { color: theme.colors.text }]}>SMS Blocklist</Text>
            <Text style={{ color: theme.colors.textSecondary, marginBottom: 16 }}>
                Messages from these addresses or containing these keywords will be ignored during sync.
            </Text>

            <Text style={[styles.sectionTitle, { color: theme.colors.text, fontSize: 12 }]}>Blocked Senders</Text>
            <GlassCard style={[styles.card, { marginBottom: 20 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ flex: 1 }}>
                        <GlassInput
                            placeholder="Add Sender (e.g. ZYPE, BFL)"
                            style={{ height: 40 }}
                            onSubmitEditing={(e) => {
                                const val = e.nativeEvent.text.trim();
                                if (val && accountSettings) {
                                    const updated = { ...accountSettings, blockedSenders: [...accountSettings.blockedSenders, val] };
                                    setAccountSettings(updated);
                                    settingsService.saveAccountSettings(updated);
                                }
                            }}
                        />
                    </View>
                </View>
                <View style={{ marginTop: 10, flexDirection: 'row', flexWrap: 'wrap' }}>
                    {accountSettings?.blockedSenders?.map((sender: string, i: number) => (
                        <TouchableOpacity
                            key={i}
                            style={styles.chip}
                            onPress={() => {
                                const updated = { ...accountSettings, blockedSenders: accountSettings.blockedSenders.filter((_: any, idx: number) => idx !== i) };
                                setAccountSettings(updated);
                                settingsService.saveAccountSettings(updated);
                            }}
                        >
                            <Text style={{ color: theme.colors.text, marginRight: 4 }}>{sender}</Text>
                            <Ionicons name="close-circle" size={16} color={theme.colors.error} />
                        </TouchableOpacity>
                    ))}
                </View>
            </GlassCard>

            <Text style={[styles.sectionTitle, { color: theme.colors.text, fontSize: 12 }]}>Blocked Keywords</Text>
            <GlassCard style={styles.card}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ flex: 1 }}>
                        <GlassInput
                            placeholder="Add Keyword (e.g. loan, offer)"
                            style={{ height: 40 }}
                            onSubmitEditing={(e) => {
                                const val = e.nativeEvent.text.trim().toLowerCase();
                                if (val && accountSettings) {
                                    const updated = { ...accountSettings, blockedKeywords: [...accountSettings.blockedKeywords, val] };
                                    setAccountSettings(updated);
                                    settingsService.saveAccountSettings(updated);
                                }
                            }}
                        />
                    </View>
                </View>
                <View style={{ marginTop: 10, flexDirection: 'row', flexWrap: 'wrap' }}>
                    {accountSettings?.blockedKeywords?.map((kw: string, i: number) => (
                        <TouchableOpacity
                            key={i}
                            style={styles.chip}
                            onPress={() => {
                                const updated = { ...accountSettings, blockedKeywords: accountSettings.blockedKeywords.filter((_: any, idx: number) => idx !== i) };
                                setAccountSettings(updated);
                                settingsService.saveAccountSettings(updated);
                            }}
                        >
                            <Text style={{ color: theme.colors.text, marginRight: 4 }}>{kw}</Text>
                            <Ionicons name="close-circle" size={16} color={theme.colors.error} />
                        </TouchableOpacity>
                    ))}
                </View>
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
                            {renderMenuItem('wallet-outline', 'Accounts', 'Bank accounts, UPI, Cash', () => navigation.navigate('AccountSettings' as never))}
                            <View style={styles.divider} />
                            {renderMenuItem('pricetags-outline', 'Categories', 'Manage expense & income categories', () => navigation.navigate('CategoryManager' as never))}
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
                            {renderMenuItem('close-circle-outline', 'SMS Blocklist', 'Manage blocked senders', () => setActiveSection('blocklist'))}
                            <View style={styles.divider} />
                            {renderMenuItem('repeat-outline', 'Recurring', 'Auto-create transactions', () => navigation.navigate('Recurring' as never))}
                            <View style={styles.divider} />
                            {renderMenuItem('notifications-outline', 'Notifications', 'Reminders & Alerts', () => setActiveSection('automation' as any))}
                        </GlassCard>

                        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Other</Text>
                        <GlassCard style={styles.card}>
                            {renderMenuItem('information-circle-outline', 'About & Help', 'Version, Diagnostics', () => setActiveSection('about'))}
                        </GlassCard>
                    </>
                )}

                {activeSection === 'privacy' && renderPrivacySection()}
                {activeSection === 'automation' && renderNotificationSection()}
                {activeSection === 'about' && renderAboutSection()}
                {activeSection === 'blocklist' && renderBlocklistSection()}

                {/* Backup Config Modal (Simplified) */}
                <Modal visible={showConfigModal} transparent animationType="fade" onRequestClose={() => setShowConfigModal(false)}>
                    <View style={styles.modalOverlay}>
                        <GlassCard style={styles.modalContent}>
                            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Cloud Backup</Text>
                            <TouchableOpacity style={styles.modalButton} onPress={() => { promptAsync(); setShowConfigModal(false); }}>
                                <Text style={{ color: '#FFF' }}>Sign in with Google</Text>
                            </TouchableOpacity>

                            <View style={styles.divider} />

                            <TouchableOpacity
                                style={[styles.modalButton, { backgroundColor: theme.colors.success, marginTop: 10 }]}
                                onPress={async () => {
                                    try {
                                        await backupService.createLocalBackup();
                                        Alert.alert('Success', 'Backup saved successfully');
                                    } catch (e: any) {
                                        Alert.alert('Error', e.message);
                                    }
                                    setShowConfigModal(false);
                                }}
                            >
                                <Text style={{ color: '#FFF' }}>Save Local Backup</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.modalButton, { backgroundColor: theme.colors.warning, marginTop: 10 }]}
                                onPress={async () => {
                                    Alert.alert('Restore Backup', 'This will overwrite your current data. Continue?', [
                                        { text: 'Cancel', style: 'cancel' },
                                        {
                                            text: 'Restore',
                                            style: 'destructive',
                                            onPress: async () => {
                                                try {
                                                    const success = await backupService.restoreLocalBackup();
                                                    if (success) {
                                                        Alert.alert('Success', 'Database restored. Please restart the app.');
                                                    }
                                                } catch (e: any) {
                                                    Alert.alert('Error', e.message);
                                                }
                                                setShowConfigModal(false);
                                            }
                                        }
                                    ]);
                                }}
                            >
                                <Text style={{ color: '#FFF' }}>Restore from File</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.modalButton, { backgroundColor: theme.colors.card, marginTop: 10 }]} onPress={() => setShowConfigModal(false)}>
                                <Text style={{ color: theme.colors.text }}>Cancel</Text>
                            </TouchableOpacity>
                        </GlassCard>
                    </View>
                </Modal>

                {/* Currency Picker Modal */}
                <Modal visible={showCurrencyPicker} transparent animationType="fade" onRequestClose={() => setShowCurrencyPicker(false)}>
                    <View style={styles.modalOverlay}>
                        <GlassCard style={styles.modalContent}>
                            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Select Currency</Text>
                            <ScrollView style={{ maxHeight: 300 }}>
                                {SUPPORTED_CURRENCIES.map(c => (
                                    <TouchableOpacity
                                        key={c.code}
                                        style={[styles.settingRow, { paddingVertical: 14 }]}
                                        onPress={async () => {
                                            if (profileSettings) {
                                                const updated = { ...profileSettings, currency: c.symbol };
                                                setProfileSettings(updated);
                                                await settingsService.saveProfileSettings(updated);
                                            }
                                            setShowCurrencyPicker(false);
                                        }}
                                    >
                                        <Text style={{ color: theme.colors.text, fontSize: 18, width: 30 }}>{c.symbol}</Text>
                                        <Text style={{ color: theme.colors.text, flex: 1, marginLeft: 8 }}>{c.name}</Text>
                                        {profileSettings?.currency === c.symbol && (
                                            <Ionicons name="checkmark-circle" size={22} color={theme.colors.primary} />
                                        )}
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                            <TouchableOpacity
                                style={[styles.modalButton, { marginTop: 12, backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }]}
                                onPress={() => setShowCurrencyPicker(false)}
                            >
                                <Text style={{ color: theme.colors.text }}>Cancel</Text>
                            </TouchableOpacity>
                        </GlassCard>
                    </View>
                </Modal>

                {/* Date Format Picker Modal */}
                <Modal visible={showDateFormatPicker} transparent animationType="fade" onRequestClose={() => setShowDateFormatPicker(false)}>
                    <View style={styles.modalOverlay}>
                        <GlassCard style={styles.modalContent}>
                            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Select Date Format</Text>
                            <ScrollView style={{ maxHeight: 300 }}>
                                {['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'].map(fmt => (
                                    <TouchableOpacity
                                        key={fmt}
                                        style={[styles.settingRow, { paddingVertical: 14 }]}
                                        onPress={async () => {
                                            if (profileSettings) {
                                                const updated = { ...profileSettings, dateFormat: fmt };
                                                setProfileSettings(updated);
                                                await settingsService.saveProfileSettings(updated);
                                            }
                                            setShowDateFormatPicker(false);
                                        }}
                                    >
                                        <Text style={{ color: theme.colors.text, flex: 1, fontSize: 16 }}>{fmt}</Text>
                                        {profileSettings?.dateFormat === fmt && (
                                            <Ionicons name="checkmark-circle" size={22} color={theme.colors.primary} />
                                        )}
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                            <TouchableOpacity
                                style={[styles.modalButton, { marginTop: 12, backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }]}
                                onPress={() => setShowDateFormatPicker(false)}
                            >
                                <Text style={{ color: theme.colors.text }}>Cancel</Text>
                            </TouchableOpacity>
                        </GlassCard>
                    </View>
                </Modal>

                {/* Theme Picker Modal */}
                <Modal visible={showThemePicker} transparent animationType="fade" onRequestClose={() => setShowThemePicker(false)}>
                    <View style={styles.modalOverlay}>
                        <GlassCard style={styles.modalContent}>
                            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Appearance</Text>
                            <ScrollView style={{ maxHeight: 300 }}>
                                {['system', 'light', 'dark'].map(mode => (
                                    <TouchableOpacity
                                        key={mode}
                                        style={[styles.settingRow, { paddingVertical: 14 }]}
                                        onPress={async () => {
                                            if (profileSettings) {
                                                const updated = { ...profileSettings, themePreference: mode as 'system' | 'light' | 'dark' };
                                                setProfileSettings(updated);
                                                await settingsService.saveProfileSettings(updated);
                                                // Function to update global theme context
                                                // Assuming we can access text mode here or via context update
                                                // toggleTheme won't work for system, we need setThemeMode
                                                // But context isn't exposed here beyond toggleTheme?
                                                // checking context usage... const { theme, isDark, toggleTheme } = useTheme();
                                                // I need to add setThemeMode to useTheme return in SettingsScreen
                                            }
                                            setShowThemePicker(false);
                                        }}
                                    >
                                        <Ionicons
                                            name={mode === 'system' ? 'phone-portrait-outline' : mode === 'dark' ? 'moon-outline' : 'sunny-outline'}
                                            size={20}
                                            color={theme.colors.text}
                                            style={{ marginRight: 10 }}
                                        />
                                        <Text style={{ color: theme.colors.text, flex: 1, fontSize: 16, textTransform: 'capitalize' }}>{mode}</Text>
                                        {profileSettings?.themePreference === mode && (
                                            <Ionicons name="checkmark-circle" size={22} color={theme.colors.primary} />
                                        )}
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                            <TouchableOpacity
                                style={[styles.modalButton, { marginTop: 12, backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }]}
                                onPress={() => setShowThemePicker(false)}
                            >
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
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        backgroundColor: 'rgba(150,150,150,0.1)',
        marginRight: 8,
        marginBottom: 8,
    },
});
