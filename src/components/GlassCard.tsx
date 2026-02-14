import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '../contexts/ThemeContext';

interface GlassCardProps {
    children: React.ReactNode;
    style?: StyleProp<ViewStyle>;
    intensity?: number;
}

export const GlassCard = ({ children, style, intensity = 20 }: GlassCardProps) => {
    const { isDark, theme } = useTheme();

    return (
        <View style={[styles.container, { borderColor: theme.colors.border }, style]}>
            <BlurView
                intensity={intensity}
                tint={isDark ? 'dark' : 'light'}
                style={StyleSheet.absoluteFill}
            />
            <View style={[styles.content, { backgroundColor: theme.colors.glass }]}>
                {children}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderTopWidth: 1.5,
        borderLeftWidth: 1.5,
    },
    content: {
        padding: 20,
        width: '100%',
    },
});
