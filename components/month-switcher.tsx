import { Icon } from "@/components/icon";
import { PressLink } from "@/components/pressable";
import type { MonthView } from "@/lib/format";

/**
 * Steps a month-scoped screen back and forward through history.
 *
 * Plain links rather than buttons and client state: each month is then a real
 * URL, so it can be shared, refreshed, and — the part that matters in a
 * standalone PWA — walked back with the system Back gesture instead of
 * needing its own way out.
 *
 * The forward arrow is rendered disabled rather than hidden at the present
 * month, so the control keeps its width and the label underneath never shifts.
 */
export function MonthSwitcher({
  view,
  basePath,
}: {
  view: MonthView;
  /** "/expenses" or "/reports" — the screen this switcher belongs to. */
  basePath: string;
}) {
  return (
    <div className="flex items-center gap-1">
      <PressLink
        href={`${basePath}?m=${view.previous}`}
        aria-label="Previous month"
        scroll={false}
        className="tap flex h-9 w-9 items-center justify-center rounded-full text-ink-faint"
      >
        <Icon name="chevron_left" size={20} />
      </PressLink>

      {view.next ? (
        <PressLink
          href={`${basePath}?m=${view.next}`}
          aria-label="Next month"
          scroll={false}
          className="tap flex h-9 w-9 items-center justify-center rounded-full text-ink-faint"
        >
          <Icon name="chevron_right" size={20} />
        </PressLink>
      ) : (
        <span
          aria-hidden
          className="flex h-9 w-9 items-center justify-center rounded-full text-line-strong"
        >
          <Icon name="chevron_right" size={20} />
        </span>
      )}

      {/* Only worth offering once it actually does something. */}
      {!view.isCurrent ? (
        <PressLink
          href={basePath}
          scroll={false}
          className="tap ml-1 rounded-full px-3 py-1.5 text-meta text-accent"
        >
          Today
        </PressLink>
      ) : null}
    </div>
  );
}
