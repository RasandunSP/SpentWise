"use client";

import { useEffect } from "react";
import { useTheme } from "next-themes";

/** Must match --paper in app/globals.css for each scheme. */
const PAPER = { light: "#ffffff", dark: "#0e1116" } as const;

/**
 * Keeps the browser chrome in step with an explicit theme choice.
 *
 * The two `theme-color` metas in app/layout.tsx are keyed to
 * `prefers-color-scheme`, so they follow the *device*, not the app. Pick Dark
 * on a phone set to Light and the page turns dark while the status bar stays
 * white — a bright band above a dark app, exactly the seam a standalone PWA
 * should not have.
 *
 * This rewrites their `content` rather than removing them. Those tags are
 * rendered by Next, which means React owns those DOM nodes: deleting them made
 * React throw `removeChild` of null on the next navigation that tried to
 * unmount them, which took the whole client router down with it. Setting an
 * attribute leaves the tree React expects intact, and updating *every* tag —
 * rather than trying to out-specify them — means whichever one the browser
 * picks carries the right colour.
 */
export function ThemeColorSync() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    if (resolvedTheme !== "light" && resolvedTheme !== "dark") return;

    const color = PAPER[resolvedTheme];
    const tags = document.querySelectorAll<HTMLMetaElement>(
      'meta[name="theme-color"]',
    );

    if (tags.length === 0) {
      // Nothing to update (a layout that dropped the tags) — add one we own.
      const meta = document.createElement("meta");
      meta.name = "theme-color";
      meta.content = color;
      document.head.appendChild(meta);
      return;
    }

    for (const tag of tags) tag.content = color;
  }, [resolvedTheme]);

  return null;
}
