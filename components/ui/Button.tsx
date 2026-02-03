import { ThemedText } from "@/components/themed-text";
import { useThemeColor } from "@/hooks/use-theme-color";
import React from "react";
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
  const primary = useThemeColor({}, "primary");
  const accent = useThemeColor({}, "accent");
  const surface = useThemeColor({}, "surface");

  const backgroundColor =
    variant === "primary"
      ? primary
      : variant === "secondary"
        ? accent
        : surface;
  const textColor = variant === "primary" ? "#FFFFFF" : "#2C3E50";

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

const styles = StyleSheet.create({
  button: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  text: {
    fontSize: 16,
    fontWeight: "700",
  },
});
