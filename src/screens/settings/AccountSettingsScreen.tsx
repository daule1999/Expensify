import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Switch } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { settingsService } from '../../services/settings.service';
import * as LocalAuthentication from 'expo-local-authentication';
import { encryptionService } from '../../services/encryption.service';
import { useTheme } from '../../contexts/ThemeContext';
import { GlassHeader } from '../../components/GlassHeader';

export const AccountSettingsScreen = () => {
    const navigation = useNavigation();
    const { theme } = useTheme();
    const [biometricsEnabled, setBiometricsEnabled] = useState(false);
    const [isBiometricSupported, setIsBiometricSupported] = useState(false);

    useEffect(() => {
        checkBiometrics();
        loadSettings();
    }, []);

    const checkBiometrics = async () => {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();
        setIsBiometricSupported(hasHardware && isEnrolled);
    };

    const loadSettings = async () => {
        const biometrics = await encryptionService.isBiometricsEnabled();
        setBiometricsEnabled(biometrics);
    };

    const toggleBiometrics = async (value: boolean) => {
        if (value) {
            const result = await LocalAuthentication.authenticateAsync({
                promptMessage: 'Authenticate to enable biometrics',
            });
            if (result.success) {
                await encryptionService.setBiometricsEnabled(true);
                setBiometricsEnabled(true);
            }
        } else {
            await encryptionService.setBiometricsEnabled(false);
            setBiometricsEnabled(false);
        }
    };

    const handleChangePassword = () => {
        Alert.alert('Coming Soon', 'Change password functionality will be added soon.');
    };

    const handleDeleteAccount = () => {
        Alert.alert(
            'Delete Account',
            'Are you sure you want to delete your account? This action cannot be undone and all your data will be lost.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        await encryptionService.clearAllData();
                        // You might want to navigate to a setup screen or restart the app here
                        Alert.alert('Success', 'Account data deleted. Please restart the app.');
                    }
                }
            ]
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <GlassHeader
                title="Account Settings"
                showBack
                onBack={() => navigation.goBack()}
            />
            <ScrollView
                style={styles.content}
                contentContainerStyle={{ paddingBottom: 100, paddingTop: 100 }}
            >
                <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Security</Text>

                    {isBiometricSupported && (
                        <View style={[styles.settingRow, { borderBottomColor: theme.colors.border }]}>
                            <View>
                                <Text style={[styles.settingLabel, { color: theme.colors.text }]}>Biometric Authentication</Text>
                                <Text style={[styles.settingDescription, { color: theme.colors.textSecondary }]}>
                                    Use FaceID/TouchID to unlock
                                </Text>
                            </View>
                            <Switch
                                value={biometricsEnabled}
                                onValueChange={toggleBiometrics}
                                trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                                thumbColor={theme.colors.buttonText}
                            />
                        </View>
                    )}

                    <TouchableOpacity
                        style={styles.settingRow}
                        onPress={handleChangePassword}
                    >
                        <View>
                            <Text style={[styles.settingLabel, { color: theme.colors.text }]}>Change Password</Text>
                            <Text style={[styles.settingDescription, { color: theme.colors.textSecondary }]}>
                                Update your master password
                            </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={24} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                </View>

                <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Data Management</Text>

                    <TouchableOpacity style={[styles.settingRow, { borderBottomColor: theme.colors.border }]}>
                        <View>
                            <Text style={[styles.settingLabel, { color: theme.colors.text }]}>Export Data</Text>
                            <Text style={[styles.settingDescription, { color: theme.colors.textSecondary }]}>
                                Download a backup of your data
                            </Text>
                        </View>
                        <Ionicons name="download-outline" size={24} color={theme.colors.primary} />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.settingRow}>
                        <View>
                            <Text style={[styles.settingLabel, { color: theme.colors.text }]}>Import Data</Text>
                            <Text style={[styles.settingDescription, { color: theme.colors.textSecondary }]}>
                                Restore from a backup file
                            </Text>
                        </View>
                        <Ionicons name="cloud-upload-outline" size={24} color={theme.colors.primary} />
                    </TouchableOpacity>
                </View>

                <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
                    <Text style={[styles.sectionTitle, { color: theme.colors.error }]}>Danger Zone</Text>

                    <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={handleDeleteAccount}
                    >
                        <Ionicons name="trash-outline" size={24} color={theme.colors.error} />
                        <Text style={[styles.deleteButtonText, { color: theme.colors.error }]}>Delete Account & Data</Text>
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
        padding: 16,
    },
    section: {
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 16,
    },
    settingRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'transparent',
    },
    settingLabel: {
        fontSize: 16,
        fontWeight: '500',
    },
    settingDescription: {
        fontSize: 14,
        marginTop: 4,
    },
    deleteButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        gap: 8,
    },
    deleteButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
    },
});
