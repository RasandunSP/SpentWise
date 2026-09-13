"use client";

import { useEffect } from "react";
import { Icon } from "@/components/icon";
import { PressButton } from "@/components/pressable";

/**
 * Nearest boundary for anything a Server Component throws — most often a
 * dropped connection to Supabase. Without this the user gets Next's stock
 * error page, which offers no way forward; `reset()` re-runs the render.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center gap-6 px-gutter text-center">
      <Icon name="cloud_off" size={34} className="text-ink-faint" />

      <div>
        <h1 className="text-headline text-ink">Something went wrong</h1>
        <p className="pt-2 text-body text-ink-muted">
          {error.message || "Please try again in a moment."}
        </p>
      </div>

      <PressButton
        type="button"
        onClick={reset}
        className="tap flex h-12 items-center justify-center rounded-full bg-ink px-7
          text-title text-paper"
      >
        Try again
      </PressButton>
    </main>
  );
}
