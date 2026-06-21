import { useTheme } from "@/hooks/useTheme";
import React, { useMemo } from "react";
import { StyleSheet, View, type ViewProps } from "react-native";

type CardProps = ViewProps & { children?: React.ReactNode };

export default function Card({ children, style, ...rest }: CardProps) {
  const { colors, isDark } = useTheme();
  const styles = useStyles(colors, isDark);

  return (
    <View style={[styles.card, { backgroundColor: colors.card }, style]} {...rest}>
      {children}
    </View>
  );
}

const useStyles = (colors: any, isDark: boolean) => useMemo(() => StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 16,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.3 : 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
}), [colors, isDark]);
