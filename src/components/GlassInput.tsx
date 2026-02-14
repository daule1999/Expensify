import React from 'react';
import { View, TextInput, StyleSheet, TextInputProps, ViewStyle, Text } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

interface GlassInputProps extends TextInputProps {
    icon?: keyof typeof Ionicons.glyphMap;
    label?: string;
    containerStyle?: ViewStyle;
    error?: string;
    value?: string;
    placeholder?: string;
    onChangeText?: (text: string) => void;
    keyboardType?: 'default' | 'number-pad' | 'decimal-pad' | 'numeric' | 'email-address' | 'phone-pad';
    autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
    secureTextEntry?: boolean;
    multiline?: boolean;
    numberOfLines?: number;
}

export const GlassInput = ({ icon, label, containerStyle, error, style, ...props }: GlassInputProps) => {
    const { theme, isDark } = useTheme();

    return (
        <View style={[styles.wrapper, containerStyle]}>
            {label && <Text style={[styles.label, { color: theme.colors.textSecondary }]}>{label}</Text>}

            <View style={[styles.container, { borderColor: error ? theme.colors.error : theme.colors.border }]}>
                <BlurView
                    intensity={20}
                    tint={isDark ? 'dark' : 'light'}
                    style={StyleSheet.absoluteFill}
                />
                <View style={[styles.content, { backgroundColor: theme.colors.glass }]}>
                    {icon && (
                        <Ionicons
                            name={icon}
                            size={20}
                            color={theme.colors.textSecondary}
                            style={styles.icon}
                        />
                    )}
                    <TextInput
                        placeholderTextColor={theme.colors.textSecondary}
                        style={[styles.input, { color: theme.colors.text }, style]}
                        {...props}
                    />
                </View>
            </View>
            {error && <Text style={[styles.errorText, { color: theme.colors.error }]}>{error}</Text>}
        </View>
    );
};

const styles = StyleSheet.create({
    wrapper: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        marginBottom: 8,
        marginLeft: 4,
        fontWeight: '500',
    },
    container: {
        borderRadius: 15,
        overflow: 'hidden',
        borderWidth: 1,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 15,
        height: 55,
    },
    icon: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        fontSize: 16,
        height: '100%',
    },
    errorText: {
        fontSize: 12,
        marginTop: 5,
        marginLeft: 4,
    }
});
