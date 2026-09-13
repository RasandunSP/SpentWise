import { Bar, LoadingRegion } from "@/components/skeleton";

/** Mirrors app/(app)/settings/page.tsx. */
export default function SettingsLoading() {
  return (
    <LoadingRegion>
      <header
        className="px-gutter pb-4 pt-5"
        style={{ paddingTop: "calc(1.25rem + env(safe-area-inset-top))" }}
      >
        <div className="mx-auto max-w-md">
          <Bar w={104} h={26} />
          <Bar w={168} h={11} className="mt-2" />
        </div>
      </header>

      <main className="mx-auto w-full max-w-md px-gutter">
        <section className="flex flex-col gap-7 pb-section pt-4">
          {[0, 1, 2].map((field) => (
            <div key={field}>
              <Bar w={72} h={11} />
              <Bar h={22} className="mt-3" />
            </div>
          ))}
        </section>

        <section className="border-t border-line pb-section pt-6">
          <Bar w={88} h={11} />
          <div className="flex flex-col gap-5 pt-6">
            {[0, 1, 2, 3, 4].map((row) => (
              <div key={row} className="flex items-center gap-3">
                <Bar w={6} h={6} className="rounded-full" />
                <Bar w={`${52 - row * 5}%`} h={14} />
                <Bar w={56} h={12} className="ml-auto" />
              </div>
            ))}
          </div>
        </section>
      </main>
    </LoadingRegion>
  );
}
