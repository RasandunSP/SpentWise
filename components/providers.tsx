"use client";

import { ThemeProvider, useTheme } from "next-themes";
import { Toaster } from "sonner";
import type { ReactNode } from "react";
import { ThemeColorSync } from "@/components/theme-color-sync";

/**
 * The toaster, following the app's theme rather than the device's.
 *
 * Sonner's `theme` defaults to `light` and `"system"` would track the OS — which
 * is wrong the moment someone picks Dark on a light phone. Handing it the
 * resolved theme keeps toasts in step with the rest of the app.
 *
 * Split into its own component because `useTheme` only works inside the
 * provider below.
 */
function AppToaster() {
  const { resolvedTheme } = useTheme();

  return (
    <Toaster
      position="bottom-center"
      theme={resolvedTheme === "dark" ? "dark" : "light"}
      // Toasts sit above the fixed bottom nav, so they have to clear it.
      offset={{ bottom: "104px" }}
      mobileOffset={{ bottom: "104px" }}
      toastOptions={{
        // Sonner's own styles win the cascade, so each override is marked
        // important. These are all theme tokens, so the toast re-colours with
        // everything else instead of carrying a second palette.
        classNames: {
          toast:
            "!bg-paper !text-ink !border-line !rounded-xl !shadow-lg !font-sans",
          title: "!text-body !text-ink",
          description: "!text-meta !text-ink-faint",
          actionButton: "!bg-ink !text-paper !text-meta !rounded-full",
        },
      }}
    />
  );
}

/**
 * The client-side providers, mounted once at the root.
 *
 * next-themes writes the resolved scheme onto <html data-theme> and injects a
 * blocking script so the attribute is set before first paint — without that, a
 * dark-mode user sees a white flash on every cold load.
 *
 * One Toaster, at the root. A second one (per page, or conditional) makes every
 * toast appear twice, and nesting it inside anything that creates a stacking
 * context clips it behind the page.
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      attribute="data-theme"
      defaultTheme="system"
      enableSystem
      // A scheme swap is a full-screen brightness change — exactly the kind of
      // large transition that should not be animated.
      disableTransitionOnChange
    >
      <ThemeColorSync />
      {children}
      <AppToaster />
    </ThemeProvider>
  );
}
