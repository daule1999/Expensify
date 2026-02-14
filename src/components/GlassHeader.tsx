import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface GlassHeaderProps {
    title: string;
    showBack?: boolean;
    onBack?: () => void;
    rightAction?: React.ReactNode;
    style?: ViewStyle;
}

export const GlassHeader = ({ title, showBack = true, onBack, rightAction, style }: GlassHeaderProps) => {
    const { theme, isDark } = useTheme();
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();

    return (
        <View style={[styles.container, { paddingTop: insets.top }, style]}>
            <BlurView
                intensity={80}
                tint={isDark ? 'dark' : 'light'}
                style={StyleSheet.absoluteFill}
            />
            <View style={[styles.content]}>
                {showBack && (
                    <TouchableOpacity
                        onPress={onBack || (() => navigation.goBack())}
                        style={[styles.backButton, { backgroundColor: theme.colors.glass }]}
                    >
                        <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
                    </TouchableOpacity>
                )}

                <Text style={[styles.title, { color: theme.colors.text }]}>
                    {title}
                </Text>

                <View style={styles.rightAction}>
                    {rightAction}
                </View>
            </View>
            <View style={[styles.border, { backgroundColor: theme.colors.border }]} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        overflow: 'hidden',
    },
    content: {
        height: 60,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    rightAction: {
        width: 40,
        alignItems: 'flex-end',
    },
    border: {
        height: 1,
        width: '100%',
        opacity: 0.2,
    }
});
