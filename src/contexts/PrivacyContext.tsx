import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Modal, View, Text, TouchableOpacity, StyleSheet, TextInput, AppState, AppStateStatus } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { settingsService, PrivacySettings } from '../services/settings.service';
import { encryptionService } from '../services/encryption.service';

interface PrivacyContextType {
    isAmountHidden: boolean;
    toggleAmountVisibility: () => void;
    privacySettings: PrivacySettings | null;
    refreshSettings: () => Promise<void>;
}

const PrivacyContext = createContext<PrivacyContextType | undefined>(undefined);

export const PrivacyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isAmountHidden, setIsAmountHidden] = useState(false);
    const [privacySettings, setPrivacySettings] = useState<PrivacySettings | null>(null);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [passwordInput, setPasswordInput] = useState('');

    // Initial load on mount
    useEffect(() => {
        loadSettings(true); // pass true for startup
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
            // Store the background timestamp
            await AsyncStorage.setItem('@last_active_time', Date.now().toString());
        } else if (nextAppState === 'active') {
            // Check if we should lock based on idle time
            const lastActive = await AsyncStorage.getItem('@last_active_time');
            if (lastActive && privacySettings?.autoLockDelay) {
                const elapsed = Date.now() - parseInt(lastActive, 10);
                if (elapsed >= privacySettings.autoLockDelay) {
                    // Lock the app - we need to communicate this to AppNavigator
                    // For now, let's just trigger hideAmounts and maybe we need a dedicated 'lock' state
                    setIsAmountHidden(true);
                    // In a real app, you might navigate to Unlock screen here
                }
            }
        }
    };

    const loadSettings = async (isStartup = false) => {
        const settings = await settingsService.getPrivacySettings();
        setPrivacySettings(settings);

        // Only enforce startup-privacy on cold start
        if (isStartup && settings.alwaysHideOnStartup) {
            setIsAmountHidden(true);
        } else if (!isStartup) {
            // Otherwise follow the stored setting
            setIsAmountHidden(settings.hideAmounts);
        }
    };

    const refreshSettings = async () => {
        await loadSettings();
    };

    const authenticateWithBiometric = async (): Promise<boolean> => {
        try {
            const hasHardware = await LocalAuthentication.hasHardwareAsync();
            if (!hasHardware) {
                Alert.alert('Error', 'Biometric authentication not available on this device');
                return false;
            }

            const isEnrolled = await LocalAuthentication.isEnrolledAsync();
            if (!isEnrolled) {
                Alert.alert('Error', 'No biometric data enrolled. Please set up fingerprint or Face ID in your device settings.');
                return false;
            }

            const result = await LocalAuthentication.authenticateAsync({
                promptMessage: 'Authenticate to view amounts',
                fallbackLabel: 'Use Password',
                cancelLabel: 'Cancel',
            });

            return result.success;
        } catch (error) {
            console.error('Biometric auth error:', error);
            return false;
        }
    };

    const toggleAmountVisibility = async () => {
        if (!privacySettings) return;

        // If currently showing amounts and trying to hide, just hide directly
        if (!isAmountHidden) {
            setIsAmountHidden(true);
            return;
        }

        // If currently hidden and trying to show, check authentication requirements
        if (privacySettings.requirePasswordToUnhide) {
            // Try biometric first if enabled
            if (privacySettings.useBiometric) {
                const authenticated = await authenticateWithBiometric();
                if (authenticated) {
                    setIsAmountHidden(false);
                }
            } else {
                // Show password modal for global encryption password
                setShowPasswordModal(true);
            }
        } else {
            // No authentication required, direct toggle
            setIsAmountHidden(false);
        }
    };

    const handlePasswordSubmit = async () => {
        if (!passwordInput.trim()) {
            Alert.alert('Error', 'Please enter your password');
            return;
        }

        // Verify using global encryption password
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

    return (
        <PrivacyContext.Provider value={{ isAmountHidden, toggleAmountVisibility, privacySettings, refreshSettings }}>
            {children}

            <Modal
                visible={showPasswordModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowPasswordModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Enter Your Password</Text>
                        <Text style={styles.modalHint}>Use your app encryption password</Text>
                        <TextInput
                            style={styles.modalInput}
                            value={passwordInput}
                            onChangeText={setPasswordInput}
                            placeholder="Password"
                            secureTextEntry
                            autoFocus
                            onSubmitEditing={handlePasswordSubmit}
                        />
                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.cancelButton]}
                                onPress={() => {
                                    setShowPasswordModal(false);
                                    setPasswordInput('');
                                }}
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.submitButton]}
                                onPress={handlePasswordSubmit}
                            >
                                <Text style={styles.submitButtonText}>Unlock</Text>
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
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 24,
        width: '80%',
        maxWidth: 300,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 8,
        textAlign: 'center',
    },
    modalHint: {
        fontSize: 14,
        color: '#666',
        marginBottom: 16,
        textAlign: 'center',
    },
    modalInput: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        marginBottom: 16,
    },
    modalButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    modalButton: {
        flex: 1,
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: '#f0f0f0',
    },
    submitButton: {
        backgroundColor: '#007AFF',
    },
    cancelButtonText: {
        color: '#666',
        fontWeight: '600',
    },
    submitButtonText: {
        color: '#fff',
        fontWeight: '600',
    },
});
