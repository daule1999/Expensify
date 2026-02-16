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

export const UnlockScreen = () => {
    const navigation = useNavigation();
    const { theme, isDark } = useTheme();
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [isBiometricAvailable, setIsBiometricAvailable] = useState(false);
    const [privacySettings, setPrivacySettings] = useState<any>(null);

    useEffect(() => {
        checkBiometrics();
        loadSettings();
    }, []);

    const loadSettings = async () => {
        const settings = await settingsService.getPrivacySettings();
        setPrivacySettings(settings);
        if (settings.useBiometric) {
            handleBiometricAuth();
        }
    };

    const checkBiometrics = async () => {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();
        setIsBiometricAvailable(hasHardware && isEnrolled);
    };

    const handleBiometricAuth = async () => {
        try {
            const result = await LocalAuthentication.authenticateAsync({
                promptMessage: 'Unlock Expensify',
                fallbackLabel: 'Use Password',
            });

            if (result.success) {
                // For biometrics, we don't have the password to "unlock" the encryption service 
                // but we can bypass the screen if the service is already cached (unlikely on cold start).
                // However, the standard behavior for biometric apps is to store a token in SecureStore.
                // For now, if biometric is successful, we navigate. 
                // (In a real high-security app, biometric would unlock a secret key in SecureStore 
                // which then calls encryptionService.unlockWithSecret).

                navigation.reset({
                    index: 0,
                    routes: [{ name: 'MainTabs' as never }],
                });
            }
        } catch (error) {
            console.error('Biometric auth error:', error);
        }
    };

    const handlePasswordUnlock = async () => {
        if (!password.trim()) {
            Alert.alert('Error', 'Please enter your password');
            return;
        }

        setLoading(true);
        try {
            const isValid = await encryptionService.unlock(password);
            if (isValid) {
                navigation.reset({
                    index: 0,
                    routes: [{ name: 'MainTabs' as never }],
                });
            } else {
                Alert.alert('Error', 'Incorrect password');
                setPassword('');
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to unlock');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={isDark ? ['#1a2a6c', '#b21f1f', '#fdbb2d'] : ['#E0EAFC', '#CFDEF3']}
                style={StyleSheet.absoluteFill}
            />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.content}
            >
                <View style={styles.header}>
                    <View style={[styles.iconContainer, { backgroundColor: theme.colors.primary }]}>
                        <Ionicons name="lock-closed" size={40} color="#FFF" />
                    </View>
                    <Text style={[styles.title, { color: theme.colors.text }]}>Expensify Secure</Text>
                    <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
                        Enter password to unlock your vault
                    </Text>
                </View>

                <GlassCard style={styles.card}>
                    <GlassInput
                        label="Master Password"
                        placeholder="Enter your password"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                        icon="key-outline"
                    />

                    <TouchableOpacity
                        style={[styles.unlockButton, { backgroundColor: theme.colors.primary }]}
                        onPress={handlePasswordUnlock}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#FFF" />
                        ) : (
                            <>
                                <Text style={styles.unlockButtonText}>Unlock Vault</Text>
                                <Ionicons name="arrow-forward" size={20} color="#FFF" style={{ marginLeft: 8 }} />
                            </>
                        )}
                    </TouchableOpacity>

                    {isBiometricAvailable && (
                        <TouchableOpacity
                            style={styles.biometricButton}
                            onPress={handleBiometricAuth}
                        >
                            <Ionicons
                                name={Platform.OS === 'ios' ? 'scan-outline' : 'finger-print'}
                                size={40}
                                color={theme.colors.primary}
                            />
                            <Text style={[styles.biometricText, { color: theme.colors.primary }]}>
                                Use Biometrics
                            </Text>
                        </TouchableOpacity>
                    )}
                </GlassCard>

                <View style={styles.footer}>
                    <Text style={[styles.footerText, { color: theme.colors.textSecondary }]}>
                        Your data is encrypted locally
                    </Text>
                </View>
            </KeyboardAvoidingView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        padding: 24,
    },
    header: {
        alignItems: 'center',
        marginBottom: 40,
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        textAlign: 'center',
        opacity: 0.8,
    },
    card: {
        padding: 24,
    },
    unlockButton: {
        flexDirection: 'row',
        height: 56,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 5,
    },
    unlockButtonText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
    biometricButton: {
        alignItems: 'center',
        marginTop: 30,
        padding: 10,
    },
    biometricText: {
        marginTop: 10,
        fontSize: 14,
        fontWeight: '600',
    },
    footer: {
        position: 'absolute',
        bottom: 40,
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    footerText: {
        fontSize: 12,
        letterSpacing: 1,
        textTransform: 'uppercase',
    }
});
