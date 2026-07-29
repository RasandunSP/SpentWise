import type { Metadata } from "next";
import { Icon } from "@/components/icon";
import { TopAppBar } from "@/components/top-app-bar";
import { InstallHint } from "@/components/install-hint";
import { getCategories, getProfile } from "@/lib/queries";
import { requireUser } from "@/lib/supabase/server";
import { toneOf } from "@/lib/categories";
import { formatMoney } from "@/lib/format";
import { signOut } from "@/app/login/actions";
import { deleteCategory, updateCategoryBudget } from "./actions";
import { NewCategoryForm, ProfileForm } from "./settings-forms";

export const metadata: Metadata = {
  title: "Settings · SpentWise",
};

export default async function SettingsPage() {
  const [profile, categories, { user }] = await Promise.all([
    getProfile(),
    getCategories(),
    requireUser(),
  ]);

  return (
    <>
      <TopAppBar title="Settings" subtitle={user.email ?? undefined} />

      <main className="mx-auto w-full max-w-md px-gutter">
        <section className="pb-section pt-4">
          <ProfileForm profile={profile} />
        </section>

        <section className="border-t border-line pb-section pt-6">
          <h2 className="text-label uppercase text-ink-faint">Categories</h2>
          <p className="pt-2 text-meta text-ink-faint">
            Deleting one keeps its expenses — they move to Uncategorised.
          </p>

          <ul className="flex flex-col pt-4">
            {categories.map((category) => {
              const tone = toneOf(category.tone);

              return (
                <li
                  key={category.id}
                  className="flex items-center gap-3 border-b border-line py-3.5 last:border-b-0"
                >
                  <span
                    className="h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: tone.hex }}
                  />
                  <Icon name={category.icon} size={19} className="shrink-0 text-ink-faint" />

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-body text-ink">{category.name}</p>
                    {category.monthly_budget ? (
                      <p className="tabular text-meta text-ink-faint">
                        {formatMoney(Number(category.monthly_budget), profile.currency, {
                          compact: true,
                        })}{" "}
                        / month
                      </p>
                    ) : null}
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
                      className="tabular w-16 border-0 border-b border-transparent bg-transparent
                        px-0 py-1 text-right text-meta text-ink-muted placeholder:text-ink-faint
                        focus:border-accent focus:text-ink focus:outline-none"
                    />
                    <button type="submit" className="sr-only">
                      Save budget
                    </button>
                  </form>

                  <form action={deleteCategory} className="shrink-0">
                    <input type="hidden" name="id" value={category.id} />
                    <button
                      type="submit"
                      aria-label={`Delete ${category.name}`}
                      className="tap -mr-2 flex h-9 w-9 items-center justify-center rounded-full
                        text-ink-faint hover:bg-negative-soft hover:text-negative"
                    >
                      <Icon name="close" size={17} />
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>

          <NewCategoryForm existing={categories} />
        </section>

        <div className="border-t border-line pb-section pt-6">
          <InstallHint />
        </div>

        <section className="border-t border-line pt-6">
          <h2 className="text-label uppercase text-ink-faint">Account</h2>
          <form action={signOut} className="pt-4">
            <button
              type="submit"
              className="tap flex items-center gap-2 text-body text-ink-muted"
            >
              <Icon name="logout" size={18} />
              Sign out
            </button>
          </form>
        </section>
      </main>
    </>
  );
}
