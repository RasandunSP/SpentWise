import { Bar, LoadingRegion } from "@/components/skeleton";

/** Mirrors the edit screen, which shares its layout with app/add/page.tsx. */
export default function EditLoading() {
  return (
    <LoadingRegion className="flex min-h-dvh flex-col bg-paper">
      <header
        className="flex items-center justify-between px-gutter pb-1 pt-4"
        style={{ paddingTop: "calc(1rem + env(safe-area-inset-top))" }}
      >
        <Bar w={104} h={11} />
        <Bar w={36} h={36} className="rounded-full" />
      </header>

      <section className="flex flex-col items-center px-gutter pb-8 pt-6">
        <Bar w={64} h={11} />
        <Bar w={224} h={64} className="mt-5" />
      </section>

      <section className="flex gap-2 overflow-hidden px-gutter pb-5">
        {[96, 84, 108, 76].map((w, i) => (
          <Bar key={i} w={w} h={42} className="shrink-0 rounded-full" />
        ))}
      </section>

      <section className="flex items-center gap-2 px-gutter pb-5">
        <Bar w={68} h={30} className="rounded-full" />
        <Bar w={92} h={30} className="rounded-full" />
        <Bar w={104} h={30} className="ml-auto rounded-full" />
      </section>

      <div className="mt-auto grid grid-cols-3 gap-px bg-line">
        {Array.from({ length: 12 }, (_, i) => (
          <div key={i} className="flex h-16 items-center justify-center bg-paper">
            <Bar w={22} h={26} />
          </div>
        ))}
      </div>

      <div
        className="px-gutter pt-4"
        style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
      >
        <Bar h={56} className="rounded-full" />
      </div>
    </LoadingRegion>
  );
}
