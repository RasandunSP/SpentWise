import type { Metadata } from "next";
import { TopAppBar } from "@/components/top-app-bar";
import { Converter } from "@/components/converter";
import { PressLink } from "@/components/pressable";
import { Icon } from "@/components/icon";
import { getProfile } from "@/lib/queries";
import { getRates, PRIMARY_CURRENCY } from "@/lib/rates";

export const metadata: Metadata = {
  title: "Convert · SpentWise",
};

/**
 * The whole day's rate table is handed to the client in one go, so every
 * conversion afterwards is local arithmetic. The upstream call happens at most
 * once a day for the entire app, not once per visit and certainly not once per
 * keystroke.
 */
export default async function ConvertPage() {
  const [profile, rates] = await Promise.all([getProfile(), getRates()]);

  return (
    <>
      <TopAppBar title="Convert" subtitle="Live daily rates" />

      <main className="mx-auto w-full max-w-md px-gutter pt-4">
        {rates ? (
          <Converter
            rates={rates.rates}
            updatedAt={rates.updatedAt}
            initialFrom={profile.secondary_currency ?? "BDT"}
            initialTo={PRIMARY_CURRENCY}
          />
        ) : (
          <div className="py-16 text-center">
            <Icon name="cloud_off" size={30} className="text-ink-faint" />
            <p className="pt-4 text-body text-ink-muted">
              Rates aren&rsquo;t available right now.
            </p>
            <p className="pt-1 text-meta text-ink-faint">
              They refresh once a day — try again shortly.
            </p>
            <PressLink
              href="/settings"
              className="tap mt-7 inline-flex items-center gap-2 text-body text-accent"
            >
              Settings
              <Icon name="arrow_forward" size={16} />
            </PressLink>
          </div>
        )}
      </main>
    </>
  );
}
