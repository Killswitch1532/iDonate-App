import type { TextStyle } from "react-native";
import { StyleSheet, Text, type TextProps } from "react-native";

import { useThemeColor } from "@/hooks/use-theme-color";

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?:
    | "default"
    | "title"
    | "defaultSemiBold"
    | "subtitle"
    | "link"
    | "logo"
    | "display";
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = "default",
  ...rest
}: ThemedTextProps) {
  const color = useThemeColor({ light: lightColor, dark: darkColor }, "text");

  // Resolve passed style to allow sensible defaults (e.g. auto lineHeight)
  const resolved = StyleSheet.flatten(style) as TextStyle | undefined;
  let autoLineHeight: number | undefined = undefined;

  if (resolved?.lineHeight == null && resolved?.fontSize) {
    autoLineHeight = Math.round(resolved.fontSize * 1.25);
  }

  return (
    <Text
      style={[
        { color },
        type === "default" ? styles.default : undefined,
        type === "title" ? styles.title : undefined,
        type === "defaultSemiBold" ? styles.defaultSemiBold : undefined,
        type === "subtitle" ? styles.subtitle : undefined,
        type === "link" ? styles.link : undefined,
        type === "logo" ? styles.logo : undefined,
        type === "display" ? styles.display : undefined,
        autoLineHeight ? { lineHeight: autoLineHeight } : undefined,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  default: {
    fontSize: 16,
    lineHeight: 24,
  },
  defaultSemiBold: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "600",
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    lineHeight: 40,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: "700",
    lineHeight: 26,
  },
  link: {
    lineHeight: 30,
    fontSize: 16,
    color: "#0a7ea4",
  },
  logo: {
    fontSize: 32,
    fontWeight: "800",
    lineHeight: 40,
  },
  display: {
    fontSize: 20,
    fontWeight: "700",
    lineHeight: 26,
  },
});
