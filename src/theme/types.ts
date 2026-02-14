export interface ThemeColors {
  background: string;
  surface: string;
  surfaceHighlight: string;
  primary: string;
  secondary: string;
  accent: string;
  text: string;
  textSecondary: string;
  success: string;
  error: string;
  warning: string;
  info: string;
  border: string;
  card: string;
  glass: string; // Color for glassmorphism
  shadow: string;
  inputBackground: string;
  buttonText: string;
  overlay: string;
  lightGray: string;
}

export interface Theme {
  dark: boolean;
  colors: ThemeColors;
}
