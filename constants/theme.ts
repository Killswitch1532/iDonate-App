/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from "react-native";

const tintColorLight = "#0a7ea4";
const tintColorDark = "#fff";

// Colors are defined later (mapped from Palette for backward compatibility)

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: "system-ui",
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: "ui-serif",
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: "ui-rounded",
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded:
      "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

// Design tokens (spacing, radii, shadows) — used for quick, consistent polish across the app
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const Radii = {
  sm: 8,
  md: 12,
  lg: 16,
};

export const Shadows = {
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
};

// Refined color palette with complete semantic tokens for dark/light modes
export const ThemeColors = {
  light: {
    background: '#F8FAFC',
    surface: '#FFFFFF',
    card: '#FFFFFF',
    textPrimary: '#1E293B',
    textSecondary: '#64748B',
    textMuted: '#94A3B8',
    border: '#E2E8F0',
    borderLight: '#F1F5F9',
    divider: '#F0F0F0',
    primary: '#E74C3C',
    primaryLight: '#FEF2F2',
    accent: '#3B82F6',
    accentLight: '#EFF6FF',
    success: '#16A34A',
    successLight: '#DCFCE7',
    warning: '#D97706',
    warningLight: '#FEF3C7',
    error: '#DC2626',
    errorLight: '#FEE2E2',
    info: '#0891B2',
    icon: '#64748B',
    iconMuted: '#94A3B8',
    tabBarBackground: '#FFFFFF',
    tabBarBorder: '#F0F0F0',
    tabBarActive: '#E74C3C',
    tabBarInactive: '#9AA4AB',
    statusBarStyle: 'dark-content' as const,
    shadowColor: '#000',
    // Switch colors
    switchTrackOff: '#E8E8E8',
    switchTrackOn: '#4A90E2',
    switchThumb: '#FFFFFF',
  },
  dark: {
    background: '#0F172A',
    surface: '#1E293B',
    card: '#1E293B',
    textPrimary: '#F1F5F9',
    textSecondary: '#94A3B8',
    textMuted: '#64748B',
    border: '#334155',
    borderLight: '#1E293B',
    divider: '#334155',
    primary: '#EF4444',
    primaryLight: '#7F1D1D',
    accent: '#60A5FA',
    accentLight: '#1E3A5F',
    success: '#22C55E',
    successLight: '#14532D',
    warning: '#FBBF24',
    warningLight: '#78350F',
    error: '#EF4444',
    errorLight: '#7F1D1D',
    info: '#22D3EE',
    icon: '#94A3B8',
    iconMuted: '#64748B',
    tabBarBackground: '#0F172A',
    tabBarBorder: '#1E293B',
    tabBarActive: '#EF4444',
    tabBarInactive: '#64748B',
    statusBarStyle: 'light-content' as const,
    shadowColor: '#000',
    switchTrackOff: '#334155',
    switchTrackOn: '#3B82F6',
    switchThumb: '#F1F5F9',
  },
};

export type ThemeMode = 'light' | 'dark' | 'system';
export type ThemeColorKey = keyof typeof ThemeColors.light;

// Keep Colors for existing use during migration (map new palette into Colors for backward compatibility)
export const Colors = {
  light: {
    text: ThemeColors.light.textPrimary,
    background: ThemeColors.light.background,
    tint: ThemeColors.light.accent,
    primary: ThemeColors.light.primary,
    accent: ThemeColors.light.accent,
    surface: ThemeColors.light.surface,
    muted: ThemeColors.light.textMuted,
    icon: ThemeColors.light.icon,
    tabIconDefault: ThemeColors.light.tabBarInactive,
    tabIconSelected: ThemeColors.light.tabBarActive,
  },
  dark: {
    text: ThemeColors.dark.textPrimary,
    background: ThemeColors.dark.background,
    tint: ThemeColors.dark.accent,
    primary: ThemeColors.dark.primary,
    accent: ThemeColors.dark.accent,
    surface: ThemeColors.dark.surface,
    muted: ThemeColors.dark.textMuted,
    icon: ThemeColors.dark.icon,
    tabIconDefault: ThemeColors.dark.tabBarInactive,
    tabIconSelected: ThemeColors.dark.tabBarActive,
  },
};
