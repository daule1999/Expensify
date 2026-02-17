import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { initializeDatabase } from './src/database';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PrivacyProvider } from './src/contexts/PrivacyContext';
import { ThemeProvider } from './src/contexts/ThemeContext';

import { AppNavigator } from './src/navigation/AppNavigator';

export default function App() {
    const [isReady, setIsReady] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const init = async () => {
            try {
                await initializeDatabase();
                console.log('Database initialized');
                setIsReady(true);
            } catch (e: any) {
                console.error('Init error:', e);
                setError(e.message || 'Initialization failed');
            }
        };
        init();
    }, []);

    if (error) {
        return (
            <View style={[styles.container, styles.centered]}>
                <Text style={styles.errorText}>⚠️ Error</Text>
                <Text style={styles.text}>{error}</Text>
            </View>
        );
    }

    if (!isReady) {
        return (
            <View style={[styles.container, styles.centered]}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.text}>Starting Secure Environment...</Text>
            </View>
        );
    }

    return (
        <ThemeProvider>
            <PrivacyProvider>
                <SafeAreaProvider>
                    <StatusBar style="auto" />
                    <AppNavigator />
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
