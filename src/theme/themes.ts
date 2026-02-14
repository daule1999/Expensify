import { Theme } from './types';

export const LightTheme: Theme = {
  dark: false,
  colors: {
    background: '#F0F2F5',
    surface: '#FFFFFF',
    surfaceHighlight: '#F8F9FA',
    primary: '#007AFF', // Standard Blue
    secondary: '#5856D6', // Purple
    accent: '#FF2D55', // Pinkish Red
    text: '#000000',
    textSecondary: '#8E8E93',
    success: '#34C759',
    error: '#FF3B30',
    warning: '#FFCC00',
    info: '#5AC8FA',
    border: '#E5E5EA',
    card: '#FFFFFF',
    glass: 'rgba(255, 255, 255, 0.8)',
    shadow: '#000000',
    inputBackground: '#F2F2F7',
    buttonText: '#FFFFFF',
    overlay: 'rgba(0, 0, 0, 0.5)',
    lightGray: '#E5E5EA',
  },
};

export const DarkTheme: Theme = {
  dark: true,
  colors: {
    background: '#000000', // Deep Black
    surface: '#121212', // Slightly lighter black
    surfaceHighlight: '#1C1C1E',
    primary: '#0A84FF', // Neon Blue
    secondary: '#5E5CE6', // Neon Purple
    accent: '#FF375F', // Neon Pink
    text: '#FFFFFF',
    textSecondary: '#EBEBF5',
    success: '#30D158',
    error: '#FF453A',
    warning: '#FFD60A',
    info: '#64D2FF',
    border: '#38383A',
    card: '#1C1C1E',
    glass: 'rgba(30, 30, 30, 0.6)', // Dark Glass
    shadow: '#FFFFFF',
    inputBackground: '#1C1C1E',
    buttonText: '#FFFFFF',
    overlay: 'rgba(0, 0, 0, 0.7)',
    lightGray: '#3A3A3C',
  },
};
