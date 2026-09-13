"use client";

import { useCallback, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Icon } from "@/components/icon";

/** How long the user must hold before the action fires. */
const HOLD_MS = 1000;

/**
 * Hold to delete.
 *
 * Deleting a category is destructive and not undoable the way an expense is —
 * its budget and colour are gone — but it is also rare, which is exactly the
 * shape of action a confirmation dialog handles badly: a dialog trains people
 * to dismiss dialogs. Holding makes the commitment physical instead. The fill
 * *is* the progress indicator, so it adds no extra UI at rest.
 *
 * The press is slow and deliberate; the release snaps back fast. Slow where the
 * user is deciding, fast where the interface is responding.
 */
export function HoldToDelete({
  name,
  onConfirm,
}: {
  name: string;
  /** Runs once the hold completes. Returns an error message, or nothing. */
  onConfirm: () => Promise<string | undefined>;
}) {
  const [holding, setHolding] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pending, startTransition] = useTransition();

  const stop = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    setHolding(false);
  }, []);

  const start = useCallback(() => {
    if (pending) return;
    setHolding(true);
    timer.current = setTimeout(() => {
      setHolding(false);
      timer.current = null;
      // A commit worth feeling, on the devices that can.
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        try {
          navigator.vibrate(18);
        } catch {
          // Never let a blocked vibrate break the delete.
        }
      }
      startTransition(async () => {
        const error = await onConfirm();
        if (error) toast.error(error);
        else toast(`${name} deleted`);
      });
    }, HOLD_MS);
  }, [name, onConfirm, pending]);

  return (
    <button
      type="button"
      disabled={pending}
      onPointerDown={start}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      // Keyboard users get the same deliberate hold via space/enter held down.
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") start();
      }}
      onKeyUp={stop}
      aria-label={`Hold to delete ${name}`}
      title={`Hold to delete ${name}`}
      className="tap relative -mr-2 flex h-9 w-9 shrink-0 items-center justify-center
        overflow-hidden rounded-full text-ink-faint
        hover:bg-negative-soft hover:text-negative disabled:opacity-40"
    >
      {/* The fill. clip-path keeps this on the compositor — no layout, no paint. */}
      <span
        aria-hidden
        data-holding={holding ? "true" : "false"}
        className="hold-fill absolute inset-0 rounded-full bg-negative-soft"
      />
      <Icon
        name={pending ? "progress_activity" : "close"}
        size={17}
        className={`relative ${pending ? "animate-spin" : ""}`}
      />
    </button>
  );
}
