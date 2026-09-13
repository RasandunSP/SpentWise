"use client";

import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import type { ComponentProps, PointerEvent as ReactPointerEvent } from "react";

/**
 * Press feedback that lands on pointer-down.
 *
 * `:active` alone is not enough on touch: mobile Safari withholds it until it
 * has decided the touch is not the start of a scroll, which puts a visible gap
 * between the finger landing and the control acknowledging it. Driving the
 * state from `pointerdown` closes that gap; the styling itself still lives in
 * one place (`.tap[data-pressed]` in globals.css) so the two paths cannot
 * drift apart.
 *
 * The press is abandoned once the pointer travels past a small threshold — that
 * movement was a scroll, not a tap — and can be re-armed by coming back, which
 * is how a native control behaves.
 */

/** Movement past this many px means the user is scrolling, not tapping. */
const SLOP = 10;

export function usePress({ haptic = false }: { haptic?: boolean } = {}) {
  const [pressed, setPressed] = useState(false);
  const origin = useRef<{ x: number; y: number } | null>(null);

  const onPointerDown = useCallback(
    (event: ReactPointerEvent) => {
      origin.current = { x: event.clientX, y: event.clientY };
      setPressed(true);

      // Reserved for commits worth feeling. Unsupported everywhere on iOS, so
      // it is a bonus rather than the feedback itself.
      if (haptic && typeof navigator !== "undefined" && "vibrate" in navigator) {
        try {
          navigator.vibrate(8);
        } catch {
          // A blocked or unsupported vibrate must never break the press.
        }
      }
    },
    [haptic],
  );

  const onPointerMove = useCallback((event: ReactPointerEvent) => {
    if (!origin.current) return;
    const dx = event.clientX - origin.current.x;
    const dy = event.clientY - origin.current.y;
    setPressed(Math.hypot(dx, dy) <= SLOP);
  }, []);

  const release = useCallback(() => {
    origin.current = null;
    setPressed(false);
  }, []);

  return {
    pressed,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: release,
      onPointerCancel: release,
      onPointerLeave: release,
    },
    /** Spread onto the element so the CSS in globals.css can pick it up. */
    "data-pressed": pressed ? "true" : undefined,
  } as const;
}

type PressLinkProps = ComponentProps<typeof Link> & { haptic?: boolean };

/** A `next/link` that acknowledges the press the instant the finger lands. */
export function PressLink({ haptic, className = "", ...props }: PressLinkProps) {
  const press = usePress({ haptic });

  return (
    <Link
      {...props}
      {...press.handlers}
      data-pressed={press["data-pressed"]}
      className={className}
    />
  );
}

type PressButtonProps = ComponentProps<"button"> & { haptic?: boolean };

/** A `<button>` with the same instant acknowledgement. */
export function PressButton({
  haptic,
  className = "",
  ...props
}: PressButtonProps) {
  const press = usePress({ haptic });

  return (
    <button
      {...props}
      {...press.handlers}
      data-pressed={press["data-pressed"]}
      className={className}
    />
  );
}
