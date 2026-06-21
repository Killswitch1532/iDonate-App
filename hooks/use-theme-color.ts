/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { ThemeColors, Colors } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: keyof typeof ThemeColors.light | keyof typeof Colors.light
) {
  const { isDark, colors } = useTheme();
  const theme = isDark ? 'dark' : 'light';
  const colorFromProps = props[theme];

  if (colorFromProps) {
    return colorFromProps;
  } else {
    // Fallback logic to check ThemeColors then Colors for backward compatibility
    return (colors as any)[colorName] || (Colors as any)[theme][colorName];
  }
}
