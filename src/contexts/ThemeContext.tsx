import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';
import { Theme } from '../theme/types';
import { LightTheme, DarkTheme } from '../theme/themes';

interface ThemeContextType {
    theme: Theme;
    isDark: boolean;
    toggleTheme: () => void;
    setThemeMode: (mode: 'light' | 'dark' | 'system') => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
    const systemColorScheme = useColorScheme();
    const [isDark, setIsDark] = useState(systemColorScheme === 'dark');
    const [themeMode, setThemeModeState] = useState<'light' | 'dark' | 'system'>('system');

    useEffect(() => {
        loadThemePreference();
    }, []);

    useEffect(() => {
        if (themeMode === 'system') {
            setIsDark(systemColorScheme === 'dark');
        }
    }, [systemColorScheme, themeMode]);

    const loadThemePreference = async () => {
        try {
            const savedMode = await AsyncStorage.getItem('themeMode');
            if (savedMode) {
                setThemeModeState(savedMode as 'light' | 'dark' | 'system');
                if (savedMode === 'dark') setIsDark(true);
                else if (savedMode === 'light') setIsDark(false);
                else setIsDark(systemColorScheme === 'dark');
            }
        } catch (error) {
            console.error('Failed to load theme preference', error);
        }
    };

    const toggleTheme = async () => {
        const newMode = isDark ? 'light' : 'dark';
        setThemeModeState(newMode);
        setIsDark(!isDark);
        await AsyncStorage.setItem('themeMode', newMode);
    };

    const setThemeMode = async (mode: 'light' | 'dark' | 'system') => {
        setThemeModeState(mode);
        await AsyncStorage.setItem('themeMode', mode);
        if (mode === 'system') {
            setIsDark(systemColorScheme === 'dark');
        } else {
            setIsDark(mode === 'dark');
        }
    };

    const theme = isDark ? DarkTheme : LightTheme;

    return (
        <ThemeContext.Provider value={{ theme, isDark, toggleTheme, setThemeMode }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
