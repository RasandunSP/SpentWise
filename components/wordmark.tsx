/**
 * The SpentWise wordmark. Two weights in one word plus an accent dot — enough
 * brand presence to sit at the top of a screen without becoming a logo lockup.
 */
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`flex items-baseline gap-0.5 ${className}`}>
      <span className="text-title text-ink" style={{ letterSpacing: "-0.02em" }}>
        <span style={{ fontWeight: 700 }}>Spent</span>
        <span style={{ fontWeight: 300 }}>Wise</span>
      </span>
      <span
        aria-hidden="true"
        className="h-1 w-1 shrink-0 rounded-full bg-accent"
      />
    </span>
  );
}
