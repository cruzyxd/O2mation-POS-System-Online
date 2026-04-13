import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";

export function Provider({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" disableTransitionOnChange>
      {children}
    </ThemeProvider>
  );
}
