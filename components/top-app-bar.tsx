import type { ReactNode } from "react";
import Link from "next/link";
import { Icon } from "@/components/icon";

/**
 * A page title in light display type, with an optional back arrow. No fill, no
 * shadow — content scrolls under it against the paper.
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
  return (
    <header
      className="sticky top-0 z-40 bg-paper/85 backdrop-blur-xl"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="mx-auto max-w-md px-gutter pb-4 pt-5">
        {backHref ? (
          <Link
            href={backHref}
            aria-label="Back"
            className="tap -ml-2 mb-3 flex h-9 w-9 items-center justify-center rounded-full text-ink-muted"
          >
            <Icon name="arrow_back" size={22} />
          </Link>
        ) : null}

        <div className="flex items-end justify-between gap-4">
          <div className="min-w-0">
            <h1 className="truncate text-headline text-ink">{title}</h1>
            {subtitle ? (
              <p className="truncate pt-0.5 text-meta text-ink-faint">{subtitle}</p>
            ) : null}
          </div>
          {action}
        </div>
      </div>
    </header>
  );
}
