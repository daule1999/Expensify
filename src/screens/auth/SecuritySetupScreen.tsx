import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import { useNavigation } from '@react-navigation/native';
import { encryptionService } from '../../services/encryption.service';
import { settingsService } from '../../services/settings.service';
import { useTheme } from '../../contexts/ThemeContext';
import { GlassCard } from '../../components/GlassCard';
import { GlassInput } from '../../components/GlassInput';

const { width } = Dimensions.get('window');

export const SecuritySetupScreen = () => {
    const navigation = useNavigation();
    const { theme, isDark } = useTheme();
    const [step, setStep] = useState<'password' | 'confirm' | 'biometric'>('password');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [isBiometricAvailable, setIsBiometricAvailable] = useState(false);

    useEffect(() => {
        checkBiometrics();
    }, []);

    const checkBiometrics = async () => {
        try {
            const hasHardware = await LocalAuthentication.hasHardwareAsync();
            const isEnrolled = await LocalAuthentication.isEnrolledAsync();
            setIsBiometricAvailable(hasHardware && isEnrolled);
        } catch {
            setIsBiometricAvailable(false);
        }
    };

    const handlePasswordNext = () => {
        if (!password.trim()) {
            Alert.alert('Required', 'Please enter a password');
            return;
        }
        if (password.length < 4) {
            Alert.alert('Too Short', 'Password must be at least 4 characters');
            return;
        }
        setStep('confirm');
    };

    const handleConfirmPassword = async () => {
        if (password !== confirmPassword) {
            Alert.alert('Mismatch', 'Passwords do not match. Please try again.');
            setConfirmPassword('');
            return;
        }

        setLoading(true);
        try {
            // Initialize encryption with this password
            await encryptionService.initialize(password);

            // Save privacy settings with lock on startup enabled
            const privacySettings = await settingsService.getPrivacySettings();
            const updated = {
                ...privacySettings,
                requireLockOnStartup: true,
                alwaysHideOnStartup: true,
                requirePasswordToUnhide: true,
            };
            await settingsService.savePrivacySettings(updated);

            // Check if biometric is available
            if (isBiometricAvailable) {
                setStep('biometric');
            } else {
                finishSetup(false);
            }
        } catch (e: any) {
            Alert.alert('Error', e.message || 'Failed to set up password');
        } finally {
            setLoading(false);
        }
    };

    const handleEnableBiometric = async () => {
        try {
            const result = await LocalAuthentication.authenticateAsync({
                promptMessage: 'Verify your identity',
                fallbackLabel: 'Cancel',
            });

            if (result.success) {
                finishSetup(true);
            } else {
                Alert.alert('Biometric Failed', 'You can enable biometrics later in Settings.');
                finishSetup(false);
            }
        } catch {
            finishSetup(false);
        }
    };

    const finishSetup = async (biometricEnabled: boolean) => {
        const privacySettings = await settingsService.getPrivacySettings();
        const updated = { ...privacySettings, useBiometric: biometricEnabled };
        await settingsService.savePrivacySettings(updated);

        navigation.reset({
            index: 0,
            routes: [{ name: 'MainTabs' as never }],
        });
    };

    const renderPasswordStep = () => (
        <>
            <View style={styles.header}>
                <View style={[styles.iconContainer, { backgroundColor: theme.colors.primary }]}>
                    <Ionicons name="key-outline" size={40} color="#FFF" />
                </View>
                <Text style={[styles.title, { color: theme.colors.text }]}>Create Master Password</Text>
                <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
                    This password will protect your data and lock your app
                </Text>
            </View>

            <GlassCard style={styles.card}>
                <GlassInput
                    label="Master Password"
                    placeholder="Enter password (min 4 characters)"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    icon="lock-closed-outline"
                />

                <TouchableOpacity
                    style={[styles.primaryButton, { backgroundColor: theme.colors.primary }]}
                    onPress={handlePasswordNext}
                >
                    <Text style={styles.buttonText}>Continue</Text>
                    <Ionicons name="arrow-forward" size={20} color="#FFF" style={{ marginLeft: 8 }} />
                </TouchableOpacity>
            </GlassCard>
        </>
    );

    const renderConfirmStep = () => (
        <>
            <View style={styles.header}>
                <View style={[styles.iconContainer, { backgroundColor: theme.colors.success || '#4CAF50' }]}>
                    <Ionicons name="checkmark-circle-outline" size={40} color="#FFF" />
                </View>
                <Text style={[styles.title, { color: theme.colors.text }]}>Confirm Password</Text>
                <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
                    Re-enter your password to confirm
                </Text>
            </View>

            <GlassCard style={styles.card}>
                <GlassInput
                    label="Confirm Password"
                    placeholder="Re-enter your password"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                    icon="lock-closed-outline"
                />

                {loading ? (
                    <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 20 }} />
                ) : (
                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 10 }}>
                        <TouchableOpacity
                            style={[styles.secondaryButton, { borderColor: theme.colors.border }]}
                            onPress={() => { setStep('password'); setConfirmPassword(''); }}
                        >
                            <Ionicons name="arrow-back" size={20} color={theme.colors.text} />
                            <Text style={[styles.secondaryText, { color: theme.colors.text }]}>Back</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.primaryButton, { backgroundColor: theme.colors.primary, flex: 1 }]}
                            onPress={handleConfirmPassword}
                        >
                            <Text style={styles.buttonText}>Confirm</Text>
                            <Ionicons name="checkmark" size={20} color="#FFF" style={{ marginLeft: 8 }} />
                        </TouchableOpacity>
                    </View>
                )}
            </GlassCard>
        </>
    );

    const renderBiometricStep = () => (
        <>
            <View style={styles.header}>
                <View style={[styles.iconContainer, { backgroundColor: '#6C63FF' }]}>
                    <Ionicons name={Platform.OS === 'ios' ? 'scan-outline' : 'finger-print'} size={44} color="#FFF" />
                </View>
                <Text style={[styles.title, { color: theme.colors.text }]}>Enable Biometrics</Text>
                <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
                    Use fingerprint or Face ID for quick unlock
                </Text>
            </View>

            <GlassCard style={styles.card}>
                <TouchableOpacity
                    style={[styles.primaryButton, { backgroundColor: '#6C63FF' }]}
                    onPress={handleEnableBiometric}
                >
                    <Ionicons name={Platform.OS === 'ios' ? 'scan-outline' : 'finger-print'} size={22} color="#FFF" style={{ marginRight: 8 }} />
                    <Text style={styles.buttonText}>Enable Biometrics</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.skipButton]}
                    onPress={() => finishSetup(false)}
                >
                    <Text style={[styles.skipText, { color: theme.colors.textSecondary }]}>Skip for now</Text>
                </TouchableOpacity>
            </GlassCard>
        </>
    );

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={isDark ? ['#1A0033', '#0D0D2B', '#000000'] : ['#E0EAFC', '#CFDEF3', '#F5F7FA']}
                style={StyleSheet.absoluteFill}
            />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.content}
            >
                {/* Progress dots */}
                <View style={styles.progressRow}>
                    {['password', 'confirm', 'biometric'].map((s, i) => (
                        <View
                            key={s}
                            style={[
                                styles.progressDot,
                                {
                                    backgroundColor:
                                        s === step ? theme.colors.primary :
                                            ['password', 'confirm', 'biometric'].indexOf(step) > i
                                                ? theme.colors.success || '#4CAF50'
                                                : isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)',
                                    width: s === step ? 24 : 10,
                                },
                            ]}
                        />
                    ))}
                </View>

                {step === 'password' && renderPasswordStep()}
                {step === 'confirm' && renderConfirmStep()}
                {step === 'biometric' && renderBiometricStep()}

                <View style={styles.footer}>
                    <Ionicons name="shield-checkmark" size={16} color={theme.colors.textSecondary} />
                    <Text style={[styles.footerText, { color: theme.colors.textSecondary }]}>
                        {' '}All data encrypted locally on your device
                    </Text>
                </View>
            </KeyboardAvoidingView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: { flex: 1, justifyContent: 'center', padding: 24 },
    header: { alignItems: 'center', marginBottom: 32 },
    iconContainer: {
        width: 80, height: 80, borderRadius: 40,
        justifyContent: 'center', alignItems: 'center', marginBottom: 20,
        shadowColor: '#000', shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3, shadowRadius: 20, elevation: 10,
    },
    title: { fontSize: 26, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' },
    subtitle: { fontSize: 15, textAlign: 'center', lineHeight: 22, paddingHorizontal: 10 },
    card: { padding: 24 },
    primaryButton: {
        flexDirection: 'row', height: 54, borderRadius: 16,
        justifyContent: 'center', alignItems: 'center', marginTop: 10,
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2, shadowRadius: 8, elevation: 5,
    },
    secondaryButton: {
        flexDirection: 'row', height: 54, borderRadius: 16,
        justifyContent: 'center', alignItems: 'center',
        borderWidth: 1, paddingHorizontal: 16,
    },
    secondaryText: { fontSize: 16, fontWeight: '600', marginLeft: 6 },
    buttonText: { color: '#FFF', fontSize: 17, fontWeight: 'bold' },
    skipButton: { alignItems: 'center', marginTop: 20, padding: 12 },
    skipText: { fontSize: 15, fontWeight: '500' },
    progressRow: {
        flexDirection: 'row', justifyContent: 'center',
        alignItems: 'center', gap: 8, marginBottom: 32,
    },
    progressDot: { height: 10, borderRadius: 5 },
    footer: {
        flexDirection: 'row', justifyContent: 'center',
        alignItems: 'center', marginTop: 40,
    },
    footerText: { fontSize: 12, letterSpacing: 0.5 },
});
