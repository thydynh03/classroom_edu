"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";

// Next-themes injects an inline script to prevent FOUC.
// React 19 logs a false-positive console error: "Encountered a script tag while rendering React component".
// We pass scriptProps={{ async: true }} and filter this specific message in development to keep the console clean.
if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  const origError = console.error;
  console.error = (...args: unknown[]) => {
    if (
      typeof args[0] === "string" &&
      args[0].includes("Encountered a script tag while rendering React component")
    ) {
      return;
    }
    origError.apply(console, args);
  };
}

export function Providers({ children, nonce }: { children: React.ReactNode; nonce?: string }) {
  return (
    // Mặc định sáng, không theo hệ thống; chỉ đổi khi người dùng bấm nút (ThemeToggle).
    // Khóa lưu mới để người từng chọn "Theo hệ thống" ở bản cũ cũng về sáng.
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      storageKey="ce-theme"
      disableTransitionOnChange
      nonce={nonce}
      scriptProps={{ async: true }}
    >
      {children}
      <Toaster />
    </NextThemesProvider>
  );
}

