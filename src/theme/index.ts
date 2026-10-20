import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';

export const brandColors = {
  green: '#00A859',      // Ghana tro tro vibrant brand green
  greenLight: '#E8F5E9', // Soft background green for cards/chips
  greenDark: '#1B5E20',  // Premium solid forest green
  black: '#121212',      // Deep charcoal/black
  blackLight: '#1E1E1E', // Soft elevation card color in dark mode
  white: '#FFFFFF',      // Crisp clean white
  grey: '#F5F5F5',       // Soft light grey
  greyDark: '#757575',   // Medium grey
  emergency: '#D32F2F',  // Vibrant Red for SOS button / breaks
  warning: '#F57C00',    // Amber for police checkpoint/construction reports
};

export const LightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: brandColors.green,
    primaryContainer: brandColors.greenLight,
    onPrimaryContainer: brandColors.greenDark,
    background: brandColors.white,
    surface: brandColors.grey,
    surfaceVariant: brandColors.white,
    onSurface: brandColors.black,
    error: brandColors.emergency,
    outline: brandColors.greyDark,
  },
  roundness: 3, // Beautiful roundness for Material cards
};

export const DarkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: brandColors.green,
    primaryContainer: brandColors.greenDark,
    onPrimaryContainer: brandColors.white,
    background: brandColors.black,
    surface: brandColors.blackLight,
    surfaceVariant: brandColors.blackLight,
    onSurface: brandColors.white,
    error: brandColors.emergency,
    outline: brandColors.greyDark,
  },
  roundness: 3,
};
