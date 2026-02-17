import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Modal, View, Text, TouchableOpacity, StyleSheet, TextInput, AppState, AppStateStatus } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { settingsService, PrivacySettings } from '../services/settings.service';
import { encryptionService } from '../services/encryption.service';
import { useTheme } from '../contexts/ThemeContext';

interface PrivacyContextType {
    isAmountHidden: boolean;
    toggleAmountVisibility: () => void;
    privacySettings: PrivacySettings | null;
    refreshSettings: () => Promise<void>;
}

const PrivacyContext = createContext<PrivacyContextType | undefined>(undefined);

export const PrivacyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { theme, isDark } = useTheme();
    const [isAmountHidden, setIsAmountHidden] = useState(false);
    const [privacySettings, setPrivacySettings] = useState<PrivacySettings | null>(null);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [passwordInput, setPasswordInput] = useState('');
    const [isSettingUpPassword, setIsSettingUpPassword] = useState(false);

    // Initial load on mount
    useEffect(() => {
        loadSettings(true);
    }, []);

    // AppState listener
    useEffect(() => {
        const subscription = AppState.addEventListener('change', handleAppStateChange);
        return () => {
            subscription.remove();
        };
    }, [privacySettings]);

    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
        if (nextAppState === 'background' || nextAppState === 'inactive') {
            await AsyncStorage.setItem('@last_active_time', Date.now().toString());
        } else if (nextAppState === 'active') {
            const lastActive = await AsyncStorage.getItem('@last_active_time');
            if (lastActive && privacySettings?.autoLockDelay) {
                const elapsed = Date.now() - parseInt(lastActive, 10);
                if (elapsed >= privacySettings.autoLockDelay) {
                    setIsAmountHidden(true);
                }
            }
        }
    };

    const loadSettings = async (isStartup = false) => {
        const settings = await settingsService.getPrivacySettings();
        setPrivacySettings(settings);

        if (isStartup && settings.alwaysHideOnStartup) {
            setIsAmountHidden(true);
        } else if (!isStartup) {
            setIsAmountHidden(settings.hideAmounts);
        }
    };

    const refreshSettings = async () => {
        await loadSettings();
    };

    const toggleAmountVisibility = async () => {
        // If currently showing and trying to hide — just hide directly
        if (!isAmountHidden) {
            setIsAmountHidden(true);
            return;
        }

        // ALWAYS require authentication to unhide
        // Step 1: Try biometric if hardware is available
        try {
            const hasHardware = await LocalAuthentication.hasHardwareAsync();
            const isEnrolled = await LocalAuthentication.isEnrolledAsync();

            if (hasHardware && isEnrolled) {
                const result = await LocalAuthentication.authenticateAsync({
                    promptMessage: 'Authenticate to view amounts',
                    fallbackLabel: 'Use Password',
                    cancelLabel: 'Cancel',
                });

                if (result.success) {
                    setIsAmountHidden(false);
                    return;
                }
                // Biometric failed/cancelled — fall through to password
            }
        } catch (error) {
            console.error('Biometric check error:', error);
        }

        // Step 2: Check if encryption password is set up
        const isEncryptionSetup = await encryptionService.isSetup();
        if (!isEncryptionSetup) {
            setIsSettingUpPassword(true);
            setShowPasswordModal(true);
            return;
        }

        // Step 3: Fall back to password modal
        setIsSettingUpPassword(false);
        setShowPasswordModal(true);
    };

    const handlePasswordSubmit = async () => {
        if (!passwordInput.trim()) {
            Alert.alert('Error', 'Please enter your password');
            return;
        }

        if (isSettingUpPassword) {
            if (passwordInput.length < 4) {
                Alert.alert('Error', 'Password must be at least 4 characters');
                return;
            }
            try {
                await encryptionService.initialize(passwordInput);
                Alert.alert('Success', 'Password set! Tap the eye icon again to unlock.');
                setShowPasswordModal(false);
                setPasswordInput('');
                setIsSettingUpPassword(false);
            } catch (e: any) {
                Alert.alert('Error', e.message || 'Failed to set password');
            }
            return;
        }

        // Verify using the master encryption password
        const isValid = await encryptionService.unlock(passwordInput);

        if (isValid) {
            setIsAmountHidden(false);
            setShowPasswordModal(false);
            setPasswordInput('');
        } else {
            Alert.alert('Error', 'Incorrect password');
            setPasswordInput('');
        }
    };

    const dismissModal = () => {
        setShowPasswordModal(false);
        setPasswordInput('');
        setIsSettingUpPassword(false);
    };

    // Theme-aware colors for modal
    const modalBg = isDark ? '#1C1C2E' : '#FFFFFF';
    const modalTextColor = isDark ? '#EAEAEA' : '#1A1A1A';
    const modalHintColor = isDark ? '#9E9EB8' : '#666666';
    const modalInputBg = isDark ? '#2A2A3C' : '#F5F5F5';
    const modalInputBorder = isDark ? '#3A3A50' : '#DDD';
    const modalInputText = isDark ? '#EAEAEA' : '#1A1A1A';
    const cancelBg = isDark ? '#2A2A3C' : '#F0F0F0';
    const cancelTextColor = isDark ? '#BBBBCC' : '#666666';

    return (
        <PrivacyContext.Provider value={{ isAmountHidden, toggleAmountVisibility, privacySettings, refreshSettings }}>
            {children}

            <Modal
                visible={showPasswordModal}
                transparent
                animationType="fade"
                onRequestClose={dismissModal}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: modalBg }]}>
                        <Text style={[styles.modalTitle, { color: modalTextColor }]}>
                            {isSettingUpPassword ? 'Set Up Password' : 'Enter Your Password'}
                        </Text>
                        <Text style={[styles.modalHint, { color: modalHintColor }]}>
                            {isSettingUpPassword
                                ? 'Create a password to protect your data (min 4 characters)'
                                : 'Use your master password'}
                        </Text>
                        <TextInput
                            style={[styles.modalInput, {
                                borderColor: modalInputBorder,
                                backgroundColor: modalInputBg,
                                color: modalInputText,
                            }]}
                            value={passwordInput}
                            onChangeText={setPasswordInput}
                            placeholder="Password"
                            placeholderTextColor={modalHintColor}
                            secureTextEntry
                            autoFocus
                            onSubmitEditing={handlePasswordSubmit}
                        />
                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, { backgroundColor: cancelBg }]}
                                onPress={dismissModal}
                            >
                                <Text style={[styles.modalButtonText, { color: cancelTextColor }]}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, { backgroundColor: theme.colors.primary }]}
                                onPress={handlePasswordSubmit}
                            >
                                <Text style={[styles.modalButtonText, { color: '#FFF' }]}>
                                    {isSettingUpPassword ? 'Set Password' : 'Unlock'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </PrivacyContext.Provider>
    );
};

export const usePrivacy = () => {
    const context = useContext(PrivacyContext);
    if (!context) {
        throw new Error('usePrivacy must be used within PrivacyProvider');
    }
    return context;
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        borderRadius: 16,
        padding: 24,
        width: '82%',
        maxWidth: 340,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 10,
    },
    modalTitle: {
        fontSize: 19,
        fontWeight: 'bold',
        marginBottom: 6,
        textAlign: 'center',
    },
    modalHint: {
        fontSize: 13,
        marginBottom: 18,
        textAlign: 'center',
        lineHeight: 18,
    },
    modalInput: {
        borderWidth: 1,
        borderRadius: 10,
        padding: 13,
        fontSize: 16,
        marginBottom: 18,
    },
    modalButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    modalButton: {
        flex: 1,
        padding: 13,
        borderRadius: 10,
        alignItems: 'center',
    },
    modalButtonText: {
        fontWeight: '600',
        fontSize: 15,
    },
});
