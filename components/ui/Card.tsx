import { useThemeColor } from "@/hooks/use-theme-color";
import React from "react";
import { StyleSheet, View, type ViewProps } from "react-native";

type CardProps = ViewProps & { children?: React.ReactNode };

export default function Card({ children, style, ...rest }: CardProps) {
  const bg = useThemeColor({}, "surface");

  return (
    <View style={[styles.card, { backgroundColor: bg }, style]} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
});
