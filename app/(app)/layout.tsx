import { BottomNav } from "@/components/bottom-nav";

/**
 * Shell for every signed-in screen: a scrolling column with the navigation bar
 * pinned underneath. The bottom padding clears the 80px bar plus the iOS home
 * indicator so nothing ends up unreachable.
 */
export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-dvh flex-col">
      <div
        className="flex-1"
        style={{ paddingBottom: "calc(96px + env(safe-area-inset-bottom))" }}
      >
        {children}
      </div>
      <BottomNav />
    </div>
  );
}
