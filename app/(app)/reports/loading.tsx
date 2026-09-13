import { Bar, LoadingRegion } from "@/components/skeleton";

/** Mirrors app/(app)/reports/page.tsx. */
export default function ReportsLoading() {
  return (
    <LoadingRegion>
      <header
        className="px-gutter pb-4 pt-5"
        style={{ paddingTop: "calc(1.25rem + env(safe-area-inset-top))" }}
      >
        <div className="mx-auto max-w-md">
          <Bar w={132} h={26} />
          <Bar w={96} h={11} className="mt-2" />
        </div>
      </header>

      <main className="mx-auto w-full max-w-md px-gutter">
        <section className="pt-4">
          <Bar w={88} h={11} />
          <Bar w={196} h={44} className="mt-4" />
        </section>

        <section className="pt-section">
          <Bar h={6} className="rounded-full" />
          <div className="flex flex-wrap gap-x-4 gap-y-2 pt-5">
            {[64, 78, 52, 70, 58].map((w, i) => (
              <Bar key={i} w={w} h={11} />
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-5 pt-section">
          {[0, 1, 2, 3, 4].map((row) => (
            <div key={row}>
              <div className="flex items-baseline justify-between pb-2">
                <Bar w={`${44 - row * 4}%`} h={13} />
                <Bar w={40} h={11} />
              </div>
              <Bar h={4} className="rounded-full" />
            </div>
          ))}
        </section>
      </main>
    </LoadingRegion>
  );
}
