"use client";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/cn";

export type ColorMode = "light" | "dark";

export function useColorMode() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const colorMode: ColorMode = (resolvedTheme ?? theme) === "dark" ? "dark" : "light";
  const toggleColorMode = () => setTheme(colorMode === "dark" ? "light" : "dark");
  return { colorMode, setColorMode: setTheme, toggleColorMode };
}
