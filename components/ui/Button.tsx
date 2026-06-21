import { ThemedText } from "@/components/themed-text";
import { useTheme } from "@/hooks/useTheme";
import React, { useMemo } from "react";
import {
    StyleSheet,
    TouchableOpacity,
    type TouchableOpacityProps
} from "react-native";

type ButtonProps = TouchableOpacityProps & {
  variant?: "primary" | "secondary" | "ghost";
  children?: React.ReactNode;
};

export default function Button({
  variant = "primary",
  style,
  children,
  ...rest
}: ButtonProps) {
  const { colors, isDark } = useTheme();
  const styles = useStyles(colors, isDark);

  const backgroundColor =
    variant === "primary"
      ? colors.primary
      : variant === "secondary"
        ? colors.accent
        : colors.surface;
  const textColor = variant === "primary" ? colors.surface : colors.textPrimary;

  return (
    <TouchableOpacity
      style={[styles.button, { backgroundColor }, style]}
      activeOpacity={0.85}
      {...rest}
    >
      {typeof children === "string" ? (
        <ThemedText style={[styles.text, { color: textColor }]}>
          {children}
        </ThemedText>
      ) : (
        children
      )}
    </TouchableOpacity>
  );
}

const useStyles = (colors: any, isDark: boolean) => useMemo(() => StyleSheet.create({
  button: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: isDark ? 0.2 : 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  text: {
    fontSize: 16,
    fontWeight: "700",
  },
}), [colors, isDark]);
