import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Switch, TextInput, Modal, Platform, ActivityIndicator } from 'react-native';
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

    const [isSyncing, setIsSyncing] = useState(false);

    const handleSyncSms = async () => {
        if (Platform.OS !== 'android') {
            Alert.alert('Not Supported', 'SMS Sync is only available on Android devices.');
            return;
        }

        try {
            const hasPermission = await smsService.checkPermission();
            if (!hasPermission) {
                Alert.alert('Permission Denied', 'SMS permission is required to sync transactions.');
                return;
            }

            Alert.alert(
                'Sync SMS',
                'This will scan your SMS inbox for transaction messages. This might take a moment.',
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Start Sync',
                        onPress: async () => {
                            setIsSyncing(true);
                            try {
                                const result = await smsService.syncAllTransactions();
                                Alert.alert(
                                    'Sync Complete',
                                    `Processed ${result.processed} messages.\nAdded ${result.added} new transactions.`
                                );
                            } catch (error) {
                                Alert.alert('Error', 'Failed to sync SMS transactions.');
                                console.error(error);
                            } finally {
                                setIsSyncing(false);
                            }
                        }
                    }
                ]
            );
        } catch (error) {
            Alert.alert('Error', 'An error occurred while checking permissions.');
        }
    };

    const [privacySettings, setPrivacySettings] = useState<PrivacySettings | null>(null);
    const [profileSettings, setProfileSettings] = useState<ProfileSettings | null>(null);

    // Cloud Backup State
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

    const loadClientIds = async () => {
        try {
            const saved = await AsyncStorage.getItem('google_client_ids');
            if (saved) {
                const parsed = JSON.parse(saved);
                setClientIds(parsed);
                setTempClientIds(parsed);
            }
        } catch (e) {
            console.error('Failed to load client IDs', e);
        }
    };

    const saveClientIds = async () => {
        try {
            await AsyncStorage.setItem('google_client_ids', JSON.stringify(tempClientIds));
            setClientIds(tempClientIds);
            setShowConfigModal(false);
            Alert.alert('Success', 'Configuration saved. You can now try signing in.');
        } catch (e) {
            Alert.alert('Error', 'Failed to save configuration.');
        }
    };

    const loadSettings = async () => {
        const privacy = await settingsService.getPrivacySettings();
        const profile = await settingsService.getProfileSettings();
        setPrivacySettings(privacy);
        setProfileSettings(profile);
    };

    const handleToggleHideAmounts = async (value: boolean) => {
        if (!privacySettings) return;
        const updated = { ...privacySettings, hideAmounts: value };
        setPrivacySettings(updated);
        await settingsService.savePrivacySettings(updated);
        await refreshSettings();
    };

    const handleTogglePasswordProtection = async (value: boolean) => {
        if (!privacySettings) return;
        const updated = { ...privacySettings, requirePasswordToUnhide: value };
        setPrivacySettings(updated);
        await settingsService.savePrivacySettings(updated);
        await refreshSettings();
    };

    const handleToggleBiometric = async (value: boolean) => {
        if (!privacySettings) return;
        const updated = { ...privacySettings, useBiometric: value };
        setPrivacySettings(updated);
        await settingsService.savePrivacySettings(updated);
        await refreshSettings();
    };

    const handleUpdateProfile = async (field: keyof ProfileSettings, value: string) => {
        if (!profileSettings) return;
        const updated = { ...profileSettings, [field]: value };
        setProfileSettings(updated);
        await settingsService.saveProfileSettings(updated);
    };

    const handleExport = () => {
        Alert.alert(
            'Export Data',
            'Choose a format to export your transactions',
            [
                {
                    text: 'CSV (Excel)',
                    onPress: async () => {
                        try {
                            const transactions = await transactionService.getAll();
                            await exportService.exportToCSV(transactions);
                        } catch (error) {
                            Alert.alert('Error', error instanceof Error ? error.message : 'Failed to export to CSV');
                        }
                    }
                },
                {
                    text: 'JSON (Backup)',
                    onPress: async () => {
                        try {
                            const transactions = await transactionService.getAll();
                            await exportService.exportToJSON(transactions);
                        } catch (error) {
                            Alert.alert('Error', error instanceof Error ? error.message : 'Failed to export to JSON');
                        }
                    }
                },
                { text: 'Cancel', style: 'cancel' }
            ]
        );
    };

    const handleImport = async () => {
        try {
            const result = await importService.pickDocument();
            if (result.canceled) return;
            const transactions = await importService.readJSONFile(result.assets[0].uri);
            Alert.alert(
                'Confirm Import',
                `Found ${transactions.length} transactions. Do you want to import them?`,
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Import',
                        onPress: async () => {
                            try {
                                const count = await transactionService.importTransactions(transactions);
                                Alert.alert('Success', `Successfully imported ${count} transactions.`);
                            } catch (error) {
                                Alert.alert('Error', 'Failed to save transactions.');
                            }
                        }
                    }
                ]
            );
        } catch (error) {
            Alert.alert('Error', error instanceof Error ? error.message : 'Import failed');
        }
    };

    const handleGoogleSignIn = async () => {
        if (clientIds.android.includes('YOUR_ANDROID_CLIENT_ID')) {
            Alert.alert(
                'Configuration Required',
                'Please configure your Google Client IDs first.',
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Configure Now', onPress: () => setShowConfigModal(true) }
                ]
            );
            return;
        }
        promptAsync();
    };

    const handleBackup = async () => {
        if (!accessToken) {
            Alert.alert('Error', 'Please sign in to Google Drive first.');
            return;
        }
        try {
            await import('../../services/backup.service').then(m => m.backupService.uploadBackup(accessToken));
            Alert.alert('Success', 'Backup uploaded successfully!');
        } catch (error) {
            Alert.alert('Error', 'Backup failed.');
        }
    };

    const handleRestore = async () => {
        if (!accessToken) return;
        Alert.alert('Restore', 'Feature to list and restore backups would open here.');
    };

    if (!privacySettings || !profileSettings) return null;

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <LinearGradient
                colors={isDark ? ['#1A0033', '#000000'] : ['#E0EAFC', '#CFDEF3']}
                style={StyleSheet.absoluteFill}
            />

            <GlassHeader title="Settings" />

            <Modal
                visible={showConfigModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowConfigModal(false)}
            >
                <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
                    <GlassCard style={styles.modalContent}>
                        <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Google Drive Configuration</Text>
                        <Text style={[styles.modalSubtitle, { color: theme.colors.textSecondary }]}>
                            Enter your Client IDs from Google Cloud Console.
                        </Text>

                        <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Android Client ID</Text>
                        <GlassInput
                            value={tempClientIds.android}
                            onChangeText={(text) => setTempClientIds({ ...tempClientIds, android: text })}
                            placeholder="xyz...apps.googleusercontent.com"
                        />

                        <Text style={[styles.inputLabel, { color: theme.colors.text }]}>iOS Client ID</Text>
                        <GlassInput
                            value={tempClientIds.ios}
                            onChangeText={(text) => setTempClientIds({ ...tempClientIds, ios: text })}
                            placeholder="xyz...apps.googleusercontent.com"
                        />

                        <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Web Client ID</Text>
                        <GlassInput
                            value={tempClientIds.web}
                            onChangeText={(text) => setTempClientIds({ ...tempClientIds, web: text })}
                            placeholder="xyz...apps.googleusercontent.com"
                        />

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, { borderColor: theme.colors.border, borderWidth: 1 }]}
                                onPress={() => setShowConfigModal(false)}
                            >
                                <Text style={{ color: theme.colors.text }}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, { backgroundColor: theme.colors.primary }]}
                                onPress={saveClientIds}
                            >
                                <Text style={{ color: 'white', fontWeight: 'bold' }}>Save & Close</Text>
                            </TouchableOpacity>
                        </View>
                    </GlassCard>
                </View>
            </Modal>

            <ScrollView contentContainerStyle={styles.content}>

                {/* Appearance Section */}
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Appearance</Text>
                <GlassCard style={styles.card}>
                    <View style={styles.settingRow}>
                        <View style={styles.settingInfo}>
                            <Text style={[styles.settingLabel, { color: theme.colors.text }]}>Dark Mode</Text>
                            <Text style={[styles.settingHint, { color: theme.colors.textSecondary }]}>
                                {isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                            </Text>
                        </View>
                        <Switch
                            value={isDark}
                            onValueChange={toggleTheme}
                            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                            thumbColor={isDark ? '#FFF' : '#FFF'}
                        />
                    </View>
                </GlassCard>

                {/* Profile Section */}
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Profile</Text>
                <GlassCard style={styles.card}>
                    <GlassInput
                        label="Name"
                        value={profileSettings.name}
                        onChangeText={(text) => handleUpdateProfile('name', text)}
                        placeholder="Enter your name"
                        icon="person-outline"
                    />
                    <GlassInput
                        label="Email"
                        value={profileSettings.email}
                        onChangeText={(text) => handleUpdateProfile('email', text)}
                        placeholder="Enter your email"
                        keyboardType="email-address"
                        icon="mail-outline"
                    />
                    <GlassInput
                        label="Currency Symbol"
                        value={profileSettings.currency}
                        onChangeText={(text) => handleUpdateProfile('currency', text)}
                        placeholder="₹"
                        icon="cash-outline"
                    />
                </GlassCard>

                {/* Privacy Section */}
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Privacy</Text>
                <GlassCard style={styles.card}>
                    <View style={styles.settingRow}>
                        <View style={styles.settingInfo}>
                            <Text style={[styles.settingLabel, { color: theme.colors.text }]}>Hide Amounts</Text>
                            <Text style={[styles.settingHint, { color: theme.colors.textSecondary }]}>Show **** instead of amounts</Text>
                        </View>
                        <Switch
                            value={privacySettings.hideAmounts}
                            onValueChange={handleToggleHideAmounts}
                            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                            thumbColor={isDark ? '#FFF' : '#FFF'}
                        />
                    </View>
                    <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

                    <View style={styles.settingRow}>
                        <View style={styles.settingInfo}>
                            <Text style={[styles.settingLabel, { color: theme.colors.text }]}>Require Password</Text>
                            <Text style={[styles.settingHint, { color: theme.colors.textSecondary }]}>Use app password to unhide</Text>
                        </View>
                        <Switch
                            value={privacySettings.requirePasswordToUnhide}
                            onValueChange={handleTogglePasswordProtection}
                            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                            disabled={!privacySettings.hideAmounts}
                        />
                    </View>
                    <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

                    <View style={styles.settingRow}>
                        <View style={styles.settingInfo}>
                            <Text style={[styles.settingLabel, { color: theme.colors.text }]}>Use Biometric</Text>
                            <Text style={[styles.settingHint, { color: theme.colors.textSecondary }]}>FaceID / TouchID</Text>
                        </View>
                        <Switch
                            value={privacySettings.useBiometric}
                            onValueChange={handleToggleBiometric}
                            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                            disabled={!privacySettings.requirePasswordToUnhide}
                        />
                    </View>
                </GlassCard>

                {/* App Settings */}
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Configuration</Text>
                <GlassCard style={styles.card}>
                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => navigation.navigate('ExpenseSettings' as never)}
                    >
                        <Ionicons name="settings-outline" size={24} color={theme.colors.primary} />
                        <Text style={[styles.menuText, { color: theme.colors.text }]}>Expense Settings</Text>
                        <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                    <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => navigation.navigate('AccountSettings' as never)}
                    >
                        <Ionicons name="wallet-outline" size={24} color={theme.colors.primary} />
                        <Text style={[styles.menuText, { color: theme.colors.text }]}>Account Settings</Text>
                        <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                </GlassCard>

                {/* Cloud Backup Section */}
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Cloud Backup</Text>
                <GlassCard style={styles.card}>
                    <TouchableOpacity
                        style={styles.configButton}
                        onPress={() => setShowConfigModal(true)}
                    >
                        <Ionicons name="settings-sharp" size={16} color={theme.colors.textSecondary} />
                        <Text style={[styles.configButtonText, { color: theme.colors.textSecondary }]}>Configure IDs</Text>
                    </TouchableOpacity>

                    {!accessToken ? (
                        <TouchableOpacity style={styles.menuItem} onPress={handleGoogleSignIn}>
                            <Ionicons name="logo-google" size={24} color="#DB4437" />
                            <Text style={[styles.menuText, { color: theme.colors.text }]}>Connect Google Drive</Text>
                            <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                    ) : (
                        <>
                            <View style={styles.settingRow}>
                                <View style={styles.settingInfo}>
                                    <Text style={[styles.settingLabel, { color: theme.colors.text }]}>Google Drive Connected</Text>
                                    <Text style={[styles.settingHint, { color: theme.colors.success }]}>Ready to backup</Text>
                                </View>
                                <Ionicons name="checkmark-circle" size={24} color={theme.colors.success} />
                            </View>
                            <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

                            <TouchableOpacity style={styles.menuItem} onPress={handleBackup}>
                                <Ionicons name="cloud-upload" size={24} color={theme.colors.primary} />
                                <Text style={[styles.menuText, { color: theme.colors.text }]}>Backup Now</Text>
                            </TouchableOpacity>
                            <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

                            <TouchableOpacity style={styles.menuItem} onPress={handleRestore}>
                                <Ionicons name="cloud-download" size={24} color={theme.colors.primary} />
                                <Text style={[styles.menuText, { color: theme.colors.text }]}>Restore from Backup</Text>
                            </TouchableOpacity>
                        </>
                    )}
                </GlassCard>

                {/* Data Management */}
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Data Management</Text>
                <GlassCard style={styles.card}>
                    <TouchableOpacity style={styles.menuItem} onPress={handleExport}>
                        <Ionicons name="download-outline" size={24} color={theme.colors.primary} />
                        <Text style={[styles.menuText, { color: theme.colors.text }]}>Export Data (CSV/JSON)</Text>
                        <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                    <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

                    <TouchableOpacity style={styles.menuItem} onPress={handleImport}>
                        <Ionicons name="cloud-upload-outline" size={24} color={theme.colors.primary} />
                        <Text style={[styles.menuText, { color: theme.colors.text }]}>Import Data</Text>
                        <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                    <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

                    <TouchableOpacity style={styles.menuItem} onPress={handleSyncSms} disabled={isSyncing}>
                        <Ionicons name="chatbubbles-outline" size={24} color={theme.colors.primary} />
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.menuText, { color: theme.colors.text }]}>Sync from SMS</Text>
                            <Text style={[styles.settingHint, { color: theme.colors.textSecondary }]}>Scan inbox for expenses</Text>
                        </View>
                        {isSyncing ? (
                            <ActivityIndicator size="small" color={theme.colors.primary} />
                        ) : (
                            <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
                        )}
                    </TouchableOpacity>
                </GlassCard>

                {/* Version Info */}
                <Text style={[styles.versionText, { color: theme.colors.textSecondary }]}>v1.0.0 • Glass UI</Text>
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
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
        marginTop: 10,
        marginLeft: 5,
    },
    card: {
        marginBottom: 20,
    },
    settingRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
    },
    settingInfo: {
        flex: 1,
        marginRight: 16,
    },
    settingLabel: {
        fontSize: 16,
        marginBottom: 4,
    },
    settingHint: {
        fontSize: 12,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        gap: 12,
    },
    menuText: {
        flex: 1,
        fontSize: 16,
    },
    divider: {
        height: 1,
        opacity: 0.3,
        marginVertical: 5,
    },
    versionText: {
        textAlign: 'center',
        marginTop: 20,
        marginBottom: 40,
        opacity: 0.5,
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        padding: 20,
    },
    modalContent: {
        padding: 20,
        borderRadius: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 8,
        textAlign: 'center',
    },
    modalSubtitle: {
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 20,
    },
    inputLabel: {
        fontSize: 14,
        marginBottom: 6,
        marginTop: 10,
        fontWeight: '600',
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 20,
        gap: 12,
    },
    modalButton: {
        flex: 1,
        padding: 14,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    configButton: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-end',
        padding: 8,
        gap: 4,
        marginBottom: 8,
    },
    configButtonText: {
        fontSize: 12,
    },
});
