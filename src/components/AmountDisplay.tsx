import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { usePrivacy } from '../contexts/PrivacyContext';
import { settingsService, ProfileSettings } from '../services/settings.service';
import { useTheme } from '../contexts/ThemeContext';

interface AmountDisplayProps {
    amount: number;
    style?: any;
    size?: 'small' | 'medium' | 'large';
}

export const AmountDisplay: React.FC<AmountDisplayProps> = ({
    amount,
    style,
    size = 'medium'
}) => {
    const { isAmountHidden } = usePrivacy();
    const { theme } = useTheme();
    const [profileSettings, setProfileSettings] = useState<ProfileSettings | null>(null);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        const profile = await settingsService.getProfileSettings();
        setProfileSettings(profile);
    };

    if (!profileSettings) return null;

    const fontSize = size === 'small' ? 14 : size === 'large' ? 24 : 18;
    const displayText = isAmountHidden
        ? '****'
        : `${profileSettings.currency}${amount.toLocaleString()}`;

    // Extract color from style if present to override default
    const colorFromStyle = style?.color || (StyleSheet.flatten(style)?.color);

    return (
        <View style={[styles.container, style]}>
            <Text style={[
                styles.amount,
                { fontSize, color: colorFromStyle || theme.colors.text }
            ]}>
                {displayText}
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    amount: {
        fontWeight: 'bold',
    },
});
