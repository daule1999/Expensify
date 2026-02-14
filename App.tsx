import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { initializeDatabase } from './src/database';
import { encryptionService } from './src/services/encryption.service';
import { backupService } from './src/services/backup.service';
import { SetupEncryption } from './src/screens/auth/SetupEncryption';
import { UnlockScreen } from './src/screens/auth/UnlockScreen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PrivacyProvider } from './src/contexts/PrivacyContext';
import { ThemeProvider } from './src/contexts/ThemeContext';

import { AppNavigator } from './src/navigation/AppNavigator';

type AppState = 'loading' | 'setup' | 'locked' | 'unlocked';

export default function App() {
    const [appState, setAppState] = useState<AppState>('loading');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const init = async () => {
            try {
                // Initialize database
                await initializeDatabase();
                console.log('Database initialized');

                // Initialize backup service
                // backupService.initialize() - Not implemented or needed for now
                console.log('Database initialized');

                // Check encryption status
                const isSetup = await encryptionService.isSetup();
                setAppState(isSetup ? 'locked' : 'setup');
            } catch (e: any) {
                console.error('Init error:', e);
                setError(e.message || 'Initialization failed');
            }
        };
        init();
    }, []);

    const handleSetupComplete = () => {
        setAppState('unlocked');
    };

    const handleUnlock = () => {
        setAppState('unlocked');
    };

    if (error) {
        return (
            <View style={[styles.container, styles.centered]}>
                <Text style={styles.errorText}>⚠️ Error</Text>
                <Text style={styles.text}>{error}</Text>
            </View>
        );
    }

    if (appState === 'loading') {
        return (
            <View style={[styles.container, styles.centered]}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.text}>Starting Secure Environment...</Text>
            </View>
        );
    }

    // Determine if the app should be locked based on appState
    const isLocked = appState === 'locked';

    return (
        <ThemeProvider>
            <PrivacyProvider>
                <SafeAreaProvider>
                    <StatusBar style="auto" />
                    {isLocked ? (
                        <UnlockScreen onUnlock={handleUnlock} />
                    ) : (
                        <AppNavigator />
                    )}
                </SafeAreaProvider>
            </PrivacyProvider>
        </ThemeProvider>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    text: {
        marginTop: 8,
        fontSize: 16,
        color: '#333',
    },
    successText: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 18,
        color: '#666',
        marginBottom: 32,
    },
    errorText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#dc3545',
        marginBottom: 16,
    },
    info: {
        marginTop: 40,
        fontSize: 14,
        color: '#999',
        textAlign: 'center',
        lineHeight: 20,
    },
    card: {
        backgroundColor: '#f8f9fa',
        padding: 24,
        borderRadius: 16,
        width: '100%',
        alignItems: 'flex-start',
        borderWidth: 1,
        borderColor: '#e9ecef',
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 12,
        color: '#333',
    },
});
