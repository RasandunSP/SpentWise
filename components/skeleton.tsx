/**
 * Placeholder blocks for the loading screens.
 *
 * These exist so a navigation has something to land on immediately instead of
 * a blank frame while the server waits on Supabase. They mirror the real
 * layout's shapes and spacing closely enough that nothing jumps when the
 * content replaces them — a skeleton whose proportions are wrong is worse than
 * none, because it moves the page twice.
 */
export function Bar({
  w = "100%",
  h = 12,
  className = "",
}: {
  w?: string | number;
  h?: number;
  className?: string;
}) {
  return (
    <div
      className={`skeleton ${className}`}
      style={{ width: w, height: h }}
      aria-hidden
    />
  );
}

/**
 * Wraps a loading screen and announces it to assistive tech just once.
 * Takes a className so it can *be* the screen's layout container rather than an
 * extra div inside it — the add screen's keypad is pinned with `mt-auto`, which
 * needs an unbroken flex column from the root.
 */
export function LoadingRegion({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className={className}>
      <span className="sr-only">Loading</span>
      {children}
    </div>
  );
}
