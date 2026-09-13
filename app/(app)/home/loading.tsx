import { Bar, LoadingRegion } from "@/components/skeleton";
import { Wordmark } from "@/components/wordmark";

/** Mirrors app/(app)/home/page.tsx so the real content lands without a jump. */
export default function HomeLoading() {
  return (
    <LoadingRegion>
      <header
        className="mx-auto w-full max-w-md px-gutter pt-5"
        style={{ paddingTop: "calc(1.25rem + env(safe-area-inset-top))" }}
      >
        <div className="flex items-center justify-between">
          {/* The wordmark is already known — no reason to grey it out. */}
          <Wordmark />
          <Bar w={36} h={36} className="rounded-full" />
        </div>

        <div className="pt-8">
          <Bar w={112} h={17} />
          <Bar w={208} h={34} className="mt-3" />
        </div>
      </header>

      <main className="mx-auto w-full max-w-md px-gutter">
        <section className="pt-7">
          <div className="h-[168px] w-full rounded-xl bg-paper-sunk" />
        </section>

        <section className="pt-4">
          <Bar w="100%" h={64} className="rounded-xl" />
        </section>

        <section className="grid grid-cols-2 gap-3 pt-4">
          <Bar h={96} className="rounded-xl" />
          <Bar h={96} className="rounded-xl" />
        </section>

        <section className="pt-section">
          <Bar w={72} h={11} />
          <div className="flex flex-col gap-5 pt-6">
            {[0, 1, 2, 3].map((row) => (
              <div key={row} className="flex items-baseline gap-3">
                <Bar w={6} h={6} className="rounded-full" />
                <div className="flex-1">
                  <Bar w={`${58 - row * 6}%`} h={14} />
                  <Bar w={`${34 - row * 4}%`} h={10} className="mt-2" />
                </div>
                <Bar w={64} h={14} />
              </div>
            ))}
          </div>
        </section>
      </main>
    </LoadingRegion>
  );
}
