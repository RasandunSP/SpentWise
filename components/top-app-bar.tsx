"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Icon } from "@/components/icon";
import { PressLink } from "@/components/pressable";

/**
 * A page title in light display type, with an optional back arrow.
 *
 * The bar is a translucent material and the page scrolls under it. Its hairline
 * is not painted until content is actually beneath it: a rule drawn across the
 * page while the title is still sitting on bare paper separates nothing, and
 * reads as a box the title happens to live in. A one-pixel sentinel above the
 * header tells us when that moment arrives — cheaper and smoother than a scroll
 * listener, since the observer fires only on the crossing.
 */
export function TopAppBar({
  title,
  subtitle,
  backHref,
  action,
}: {
  title: string;
  subtitle?: string;
  backHref?: string;
  action?: ReactNode;
}) {
  const sentinel = useRef<HTMLDivElement | null>(null);
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    const node = sentinel.current;
    if (!node || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      ([entry]) => setStuck(!entry.isIntersecting),
      { threshold: 0 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div ref={sentinel} aria-hidden className="h-px" />

      <header
        data-stuck={stuck ? "true" : "false"}
        className="material edge-divider sticky top-0 z-40"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="mx-auto max-w-md px-gutter pb-4 pt-5">
          {backHref ? (
            <PressLink
              href={backHref}
              aria-label="Back"
              className="tap -ml-2 mb-3 flex h-9 w-9 items-center justify-center
                rounded-full text-ink-muted"
            >
              <Icon name="arrow_back" size={22} />
            </PressLink>
          ) : null}

          <div className="flex items-end justify-between gap-4">
            <div className="min-w-0">
              <h1 className="truncate text-headline text-ink">{title}</h1>
              {subtitle ? (
                <p className="truncate pt-0.5 text-meta text-ink-faint">
                  {subtitle}
                </p>
              ) : null}
            </div>
            {action}
          </div>
        </div>
      </header>
    </>
  );
}
