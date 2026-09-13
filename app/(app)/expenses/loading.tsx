import { Bar, LoadingRegion } from "@/components/skeleton";

/** Mirrors app/(app)/expenses/page.tsx — day buckets of transaction rows. */
export default function ExpensesLoading() {
  return (
    <LoadingRegion>
      <header
        className="px-gutter pb-4 pt-5"
        style={{ paddingTop: "calc(1.25rem + env(safe-area-inset-top))" }}
      >
        <div className="mx-auto max-w-md">
          <Bar w={38} h={34} className="rounded-full" />
          <Bar w={164} h={26} className="mt-4" />
          <Bar w={120} h={11} className="mt-2" />
        </div>
      </header>

      <main className="mx-auto w-full max-w-md px-gutter">
        {[0, 1].map((group) => (
          <section key={group} className="pt-7">
            <Bar w={92} h={11} />
            <div className="flex flex-col gap-5 pt-5">
              {[0, 1, 2].map((row) => (
                <div key={row} className="flex items-baseline gap-3">
                  <Bar w={6} h={6} className="rounded-full" />
                  <div className="flex-1">
                    <Bar w={`${60 - row * 8}%`} h={14} />
                    <Bar w={`${36 - row * 5}%`} h={10} className="mt-2" />
                  </div>
                  <Bar w={64} h={14} />
                </div>
              ))}
            </div>
          </section>
        ))}
      </main>
    </LoadingRegion>
  );
}
