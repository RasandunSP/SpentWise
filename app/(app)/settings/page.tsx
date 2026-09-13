import type { Metadata } from "next";
import { Icon } from "@/components/icon";
import { TopAppBar } from "@/components/top-app-bar";
import { InstallHint } from "@/components/install-hint";
import { ThemeChoice } from "@/components/theme-choice";
import { HoldToDelete } from "@/components/hold-to-delete";
import { getCategories, getProfile, getSubscriptions } from "@/lib/queries";
import { convert, getRates, PRIMARY_CURRENCY, type Rates } from "@/lib/rates";
import { monthlyEquivalent } from "@/lib/subscriptions";
import { SubscriptionsManager } from "@/components/subscriptions-manager";
import type { SubscriptionWithCategory } from "@/lib/supabase/types";
import { requireUser } from "@/lib/supabase/server";
import { toneOf } from "@/lib/categories";
import { formatMoney } from "@/lib/format";
import { signOut } from "@/app/login/actions";
import { deleteCategory, updateCategoryBudget } from "./actions";
import { NewCategoryForm, ProfileForm } from "./settings-forms";
import { PressButton } from "@/components/pressable";

export const metadata: Metadata = {
  title: "Settings · SpentWise",
};

/**
 * Grouped by what a setting is *for*, not by which table it lives in.
 *
 * The previous version was one flat column — name, symbol and budget in one
 * form, then categories, then theme, then sign out — so finding anything meant
 * reading all of it. Four titled sections let you skip to the one you came
 * for, and each carries a glyph so the scan is a shape rather than a sentence.
 */
export default async function SettingsPage() {
  const [profile, categories, subscriptions, { user }, rates] =
    await Promise.all([
      getProfile(),
      getCategories(),
      getSubscriptions(),
      requireUser(),
      getRates(),
    ]);

  return (
    <>
      <TopAppBar title="Settings" subtitle={user.email ?? undefined} />

      <main className="mx-auto w-full max-w-md px-gutter">
        <Section glyph="payments" title="You & money">
          <ProfileForm
            profile={profile}
            currencyCodes={rates ? Object.keys(rates.rates) : []}
            primaryCode={PRIMARY_CURRENCY}
          />
        </Section>

        <Section
          glyph="autorenew"
          title="Subscriptions"
          note="Nothing is charged automatically — each one waits on Home until you log it."
        >
          <SubscriptionsManager
            subscriptions={subscriptions}
            categories={categories}
            currency={profile.currency}
            currencyCodes={rates ? Object.keys(rates.rates) : []}
            primaryCode={PRIMARY_CURRENCY}
            monthlyCommitted={committedMonthly(subscriptions, rates)}
          />
        </Section>

        <Section
          glyph="sell"
          title="Categories"
          note="Deleting one keeps its expenses — they move to Uncategorised."
        >
          <ul className="flex flex-col pt-1">
            {categories.map((category) => {
              const tone = toneOf(category.tone);

              return (
                <li
                  key={category.id}
                  className="flex items-center gap-3 border-b border-line py-3.5 last:border-b-0"
                >
                  <Icon
                    name={category.icon}
                    size={19}
                    className="shrink-0"
                    style={{ color: tone.color }}
                  />

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-body text-ink">{category.name}</p>
                  </div>

                  {/* Inline budget edit — submits on Enter, no separate screen. */}
                  <form action={updateCategoryBudget} className="shrink-0">
                    <input type="hidden" name="id" value={category.id} />
                    <label className="sr-only" htmlFor={`budget-${category.id}`}>
                      Monthly budget for {category.name}
                    </label>
                    <input
                      id={`budget-${category.id}`}
                      name="monthly_budget"
                      type="text"
                      inputMode="decimal"
                      defaultValue={category.monthly_budget ?? ""}
                      placeholder="—"
                      aria-label={`Monthly budget for ${category.name}`}
                      className="tabular w-20 border-0 border-b border-transparent bg-transparent
                        px-0 py-1 text-right text-meta text-ink-muted placeholder:text-ink-faint
                        focus:border-accent focus:text-ink focus:outline-none"
                    />
                    <PressButton type="submit" className="sr-only">
                      Save budget
                    </PressButton>
                  </form>

                  <HoldToDelete
                    name={category.name}
                    onConfirm={async () => {
                      "use server";
                      return deleteCategory(category.id);
                    }}
                  />
                </li>
              );
            })}
          </ul>

          {categories.some((c) => c.monthly_budget) ? (
            <p className="pt-3 text-meta text-ink-faint">
              Budgets total{" "}
              {formatMoney(
                categories.reduce(
                  (sum, c) => sum + Number(c.monthly_budget ?? 0),
                  0,
                ),
                profile.currency,
                { compact: true },
              )}{" "}
              a month.
            </p>
          ) : null}

          <NewCategoryForm existing={categories} />
        </Section>

        <Section glyph="contrast" title="Appearance">
          <ThemeChoice />
        </Section>

        <Section glyph="info" title="App">
          <InstallHint />

          <form action={signOut} className="pt-6">
            <PressButton
              type="submit"
              className="tap flex items-center gap-2 text-body text-ink-muted"
            >
              <Icon name="logout" size={18} />
              Sign out
            </PressButton>
          </form>
        </Section>
      </main>
    </>
  );
}

/**
 * Committed spend per month, across every cadence and currency.
 *
 * Null rather than a wrong number when a foreign subscription cannot be
 * converted: a total that silently drops one line, or counts 15 USD as 15 LKR,
 * is worse than no total at all.
 */
function committedMonthly(
  subscriptions: SubscriptionWithCategory[],
  rates: Rates | null,
): number | null {
  let total = 0;

  for (const subscription of subscriptions) {
    if (!subscription.active) continue;

    const monthly = monthlyEquivalent(
      Number(subscription.amount),
      subscription.cadence,
    );

    if (!subscription.currency) {
      total += monthly;
      continue;
    }

    if (!rates) return null;
    const converted = convert(
      monthly,
      subscription.currency,
      PRIMARY_CURRENCY,
      rates,
    );
    if (converted === null) return null;
    total += converted;
  }

  return total;
}

/** One titled group. The glyph does the scanning; the title does the naming. */
function Section({
  glyph,
  title,
  note,
  children,
}: {
  glyph: string;
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-line pb-section pt-6 first:border-t-0 first:pt-4">
      <h2 className="flex items-center gap-1.5 text-label uppercase text-ink-faint">
        <Icon name={glyph} size={14} aria-hidden />
        {title}
      </h2>
      {note ? <p className="pt-2 text-meta text-ink-faint">{note}</p> : null}
      <div className="pt-5">{children}</div>
    </section>
  );
}
