import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
} from 'react-native';
import { encryptionService } from '../../services/encryption.service';
import { useTheme } from '../../contexts/ThemeContext';

interface UnlockScreenProps {
    onUnlock: () => void;
}

export const UnlockScreen: React.FC<UnlockScreenProps> = ({ onUnlock }) => {
    const { theme } = useTheme();
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [attempts, setAttempts] = useState(0);

    const handleUnlock = async () => {
        if (!password) {
            Alert.alert('Error', 'Please enter your password');
            return;
        }

        setLoading(true);

        try {
            const success = await encryptionService.unlock(password);

            if (success) {
                setPassword('');
                setAttempts(0);
                onUnlock();
            } else {
                const newAttempts = attempts + 1;
                setAttempts(newAttempts);

                if (newAttempts >= 5) {
                    Alert.alert(
                        'Too Many Attempts',
                        'You have entered an incorrect password 5 times. Please wait before trying again.',
                        [{ text: 'OK' }]
                    );
                } else {
                    Alert.alert(
                        'Incorrect Password',
                        `Please try again. Attempts: ${newAttempts}/5`
                    );
                }
                setPassword('');
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to unlock. Please try again.');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={[styles.container, { backgroundColor: theme.colors.background }]}
        >
            <View style={styles.content}>
                <Text style={styles.icon}>🔒</Text>
                <Text style={[styles.title, { color: theme.colors.text }]}>Expense Tracker</Text>
                <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>Enter your master password to unlock</Text>

                <TextInput
                    style={[styles.input, {
                        backgroundColor: theme.colors.card,
                        borderColor: theme.colors.border,
                        color: theme.colors.text
                    }]}
                    placeholder="Master password"
                    placeholderTextColor={theme.colors.textSecondary}
                    secureTextEntry
                    value={password}
                    onChangeText={setPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    onSubmitEditing={handleUnlock}
                />

                {attempts > 0 && (
                    <Text style={[styles.attemptsText, { color: theme.colors.error }]}>
                        Failed attempts: {attempts}/5
                    </Text>
                )}

                <TouchableOpacity
                    style={[
                        styles.button,
                        { backgroundColor: theme.colors.primary },
                        (loading || attempts >= 5) && { backgroundColor: theme.colors.border }
                    ]}
                    onPress={handleUnlock}
                    disabled={loading || attempts >= 5}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.buttonText}>Unlock</Text>
                    )}
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
        padding: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    icon: {
        fontSize: 64,
        marginBottom: 16,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        marginBottom: 32,
        textAlign: 'center',
    },
    input: {
        width: '100%',
        borderWidth: 1,
        borderRadius: 8,
        padding: 16,
        fontSize: 16,
        marginBottom: 16,
    },
    attemptsText: {
        fontSize: 14,
        marginBottom: 8,
    },
    button: {
        width: '100%',
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
    },
    buttonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
    },
});
