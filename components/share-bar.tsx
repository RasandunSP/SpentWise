import { toneOf } from "@/lib/categories";
import { formatMoney } from "@/lib/format";

export type ShareSegment = {
  id: string;
  label: string;
  value: number;
  tone: string;
};

/**
 * Part-to-whole as one horizontal stacked bar.
 *
 * Chosen over a donut deliberately: at phone width a stacked bar keeps long
 * category names readable, compares segment lengths on one axis instead of by
 * angle, and needs no centre label. Segments are separated by a 2px paper gap
 * and every one is direct-labelled below, so identity never depends on colour.
 */
export function ShareBar({
  segments,
  total,
  currency,
}: {
  segments: ShareSegment[];
  total: number;
  currency: string;
}) {
  if (total <= 0 || segments.length === 0) {
    return <div className="h-1.5 w-full rounded-full bg-line" aria-hidden />;
  }

  const share = (value: number) => (value / total) * 100;

  return (
    <div className="flex flex-col gap-5">
      <div
        className="flex h-1.5 w-full gap-[2px] overflow-hidden rounded-full"
        role="img"
        aria-label={segments
          .map((s) => `${s.label} ${share(s.value).toFixed(0)} percent`)
          .join(", ")}
      >
        {segments.map((segment) => (
          <div
            key={segment.id}
            className="rounded-full"
            style={{
              width: `${share(segment.value)}%`,
              backgroundColor: toneOf(segment.tone).color,
            }}
          />
        ))}
      </div>

      {/* Legend — always present, and always direct-labelled. */}
      <ul className="flex flex-wrap gap-x-4 gap-y-2">
        {segments.map((segment) => (
          <li key={segment.id} className="flex items-center gap-1.5">
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ backgroundColor: toneOf(segment.tone).color }}
            />
            <span className="text-meta text-ink-muted">{segment.label}</span>
            <span className="tabular text-meta text-ink-faint">
              {share(segment.value).toFixed(0)}%
            </span>
          </li>
        ))}
      </ul>

      <p className="sr-only">
        Total {formatMoney(total, currency)} across {segments.length} categories.
      </p>
    </div>
  );
}
