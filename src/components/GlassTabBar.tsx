import React from 'react';
import { View, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

const { width } = Dimensions.get('window');

export const GlassTabBar = ({ state, descriptors, navigation }: BottomTabBarProps) => {
    const { theme, isDark } = useTheme();

    return (
        <View style={styles.container}>
            <View style={[styles.blurContainer, { borderColor: theme.colors.border }]}>
                <BlurView
                    intensity={80}
                    tint={isDark ? 'dark' : 'light'}
                    style={StyleSheet.absoluteFill}
                />
                <View style={[styles.content, { backgroundColor: theme.colors.glass }]}>
                    {state.routes.map((route, index) => {
                        const { options } = descriptors[route.key];
                        const isFocused = state.index === index;

                        const onPress = () => {
                            const event = navigation.emit({
                                type: 'tabPress',
                                target: route.key,
                                canPreventDefault: true,
                            });

                            if (!isFocused && !event.defaultPrevented) {
                                navigation.navigate(route.name);
                            }
                        };

                        let iconName: keyof typeof Ionicons.glyphMap = 'help';
                        if (route.name === 'Dashboard') iconName = isFocused ? 'home' : 'home-outline';
                        if (route.name === 'Expenses') iconName = isFocused ? 'wallet' : 'wallet-outline';
                        if (route.name === 'Income') iconName = isFocused ? 'cash' : 'cash-outline';
                        if (route.name === 'Reports') iconName = isFocused ? 'pie-chart' : 'pie-chart-outline';
                        if (route.name === 'Settings') iconName = isFocused ? 'settings' : 'settings-outline';

                        return (
                            <TouchableOpacity
                                key={index}
                                accessibilityRole="button"
                                accessibilityState={isFocused ? { selected: true } : {}}
                                accessibilityLabel={options.tabBarAccessibilityLabel}
                                testID={options.tabBarTestID}
                                onPress={onPress}
                                style={styles.tabButton}
                            >
                                <View style={[
                                    styles.iconContainer,
                                    isFocused && { backgroundColor: theme.colors.primary, shadowColor: theme.colors.primary }
                                ]}>
                                    <Ionicons
                                        name={iconName}
                                        size={24}
                                        color={isFocused ? '#FFF' : theme.colors.textSecondary}
                                    />
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 20,
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    blurContainer: {
        width: width - 40,
        height: 70,
        borderRadius: 35,
        overflow: 'hidden',
        borderWidth: 1,
        borderTopWidth: 1.5,
        borderLeftWidth: 1.5,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 10,
        },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
    },
    content: {
        flexDirection: 'row',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'space-around',
    },
    tabButton: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconContainer: {
        width: 45,
        height: 45,
        borderRadius: 22.5,
        justifyContent: 'center',
        alignItems: 'center',
    }
});
