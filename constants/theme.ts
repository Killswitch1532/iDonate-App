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

// Refined color palette (keeps existing keys for compatibility)
export const Palette = {
  light: {
    primary: "#E74C3C", // brand red
    accent: "#0a7ea4", // blue tint
    background: "#F8F4F4",
    surface: "#FFFFFF",
    muted: "#7F8C8D",
    success: "#27AE60",
    danger: "#E74C3C",
  },
  dark: {
    primary: "#E74C3C",
    accent: "#0a7ea4",
    background: "#151718",
    surface: "#1C1F1F",
    muted: "#9BA1A6",
    success: "#27AE60",
    danger: "#E74C3C",
  },
};

// Keep Colors for existing use (map new palette into Colors for backward compatibility)
export const Colors = {
  light: {
    text: "#11181C",
    background: Palette.light.background,
    tint: Palette.light.accent,
    primary: Palette.light.primary,
    accent: Palette.light.accent,
    surface: Palette.light.surface,
    muted: Palette.light.muted,
    icon: "#687076",
    tabIconDefault: "#687076",
    tabIconSelected: Palette.light.accent,
  },
  dark: {
    text: "#ECEDEE",
    background: Palette.dark.background,
    tint: Palette.dark.accent,
    primary: Palette.dark.primary,
    accent: Palette.dark.accent,
    surface: Palette.dark.surface,
    muted: Palette.dark.muted,
    icon: "#9BA1A6",
    tabIconDefault: "#9BA1A6",
    tabIconSelected: Palette.dark.accent,
  },
};
