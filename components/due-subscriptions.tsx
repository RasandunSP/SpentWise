"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Icon } from "@/components/icon";
import { PressButton } from "@/components/pressable";
import { toneOf } from "@/lib/categories";
import { formatCurrency, formatMoney } from "@/lib/format";
import { dueLabel, dueState } from "@/lib/subscriptions";
import {
  logSubscription,
  skipSubscription,
  undoSubscriptionLog,
} from "@/app/(app)/settings/subscription-actions";
import type { SubscriptionWithCategory } from "@/lib/supabase/types";

/**
 * What is about to be charged, and one tap to record it.
 *
 * A subscription is the one kind of spending you already know is coming, so
 * the app should never make you type it. But it also must not log it for you:
 * an amount that appears in the ledger without a confirmation is an assumption
 * dressed as a fact, and the ledger is the one thing here that has to be true.
 * So this is a reminder with the work attached — Log records what happened,
 * Skip says it did not, and neither one guesses.
 *
 * Only what is due inside a week reaches Home. The full list lives in Settings,
 * because a schedule is something you set up once and act on daily.
 */
export function DueSubscriptions({
  subscriptions,
  currency,
}: {
  subscriptions: SubscriptionWithCategory[];
  currency: string;
}) {
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);

  if (subscriptions.length === 0) return null;

  // Today counts as now, not as "coming up" — a charge landing this morning
  // is not a thing to plan for.
  const urgent = subscriptions.some((row) => {
    const state = dueState(row.next_due);
    return state === "overdue" || state === "today";
  });

  function log(subscription: SubscriptionWithCategory) {
    setBusy(subscription.id);

    startTransition(async () => {
      const { error, logged } = await logSubscription(subscription.id);
      setBusy(null);

      if (error || !logged) {
        toast.error(error ?? "Couldn't log that.");
        return;
      }

      toast(`${logged.name} · ${formatMoney(logged.amount, currency, { compact: true })}`, {
        description: "Logged, and the reminder moved on",
        // Long enough to read and decide, not merely to glimpse — the same
        // eight seconds Quick add gives its undo.
        duration: 8000,
        action: {
          label: "Undo",
          onClick: () => {
            void undoSubscriptionLog(
              subscription.id,
              logged.previousDue,
              logged.expenseId,
            ).then(({ error: undoError }) => {
              if (undoError) toast.error(undoError);
            });
          },
        },
      });
    });
  }

  function skip(subscription: SubscriptionWithCategory) {
    setBusy(subscription.id);

    startTransition(async () => {
      const { error, previousDue } = await skipSubscription(subscription.id);
      setBusy(null);

      if (error || !previousDue) {
        toast.error(error ?? "Couldn't skip that.");
        return;
      }

      toast(`${subscription.name} skipped`, {
        description: "Nothing was added to your spending",
        duration: 8000,
        action: {
          label: "Undo",
          onClick: () => {
            void undoSubscriptionLog(subscription.id, previousDue).then(
              ({ error: undoError }) => {
                if (undoError) toast.error(undoError);
              },
            );
          },
        },
      });
    });
  }

  return (
    <section className="pt-4">
      <h2 className="flex items-center gap-1.5 pb-3 text-label uppercase text-ink-faint">
        <Icon name="autorenew" size={14} aria-hidden />
        {urgent ? "Due now" : "Coming up"}
      </h2>

      <div className="flex flex-col gap-2">
        {subscriptions.map((subscription) => {
          const tone = toneOf(subscription.category?.tone);
          const state = dueState(subscription.next_due);
          const working = busy === subscription.id;

          return (
            <div
              key={subscription.id}
              className="flex items-center gap-3 rounded-xl border border-line px-3 py-3"
            >
              <Icon
                name={subscription.category?.icon ?? "autorenew"}
                size={18}
                className="shrink-0"
                style={{ color: tone.color }}
              />

              <div className="min-w-0 flex-1">
                <p className="truncate text-body text-ink">{subscription.name}</p>
                <p
                  className={`truncate pt-0.5 text-meta ${
                    state === "overdue" ? "text-negative" : "text-ink-faint"
                  }`}
                >
                  {dueLabel(subscription.next_due)}
                </p>
              </div>

              <span className="tabular shrink-0 text-body text-ink-muted">
                {subscription.currency
                  ? formatCurrency(Number(subscription.amount), subscription.currency, {
                      compact: true,
                    })
                  : formatMoney(Number(subscription.amount), currency, {
                      compact: true,
                    })}
              </span>

              {/* Skip is deliberately the quieter of the two: not logging is
                  the rarer answer, and it leaves no trace to undo from later. */}
              <PressButton
                type="button"
                disabled={pending}
                onClick={() => skip(subscription)}
                aria-label={`Skip ${subscription.name} this time`}
                title={`Skip ${subscription.name} this time`}
                className="tap flex h-9 w-9 shrink-0 items-center justify-center rounded-full
                  text-ink-faint disabled:opacity-40"
              >
                <Icon name="redo" size={17} />
              </PressButton>

              <PressButton
                type="button"
                haptic
                disabled={pending}
                onClick={() => log(subscription)}
                className="tap tap-subtle flex h-9 shrink-0 items-center gap-1.5 rounded-full
                  bg-ink px-3.5 text-meta text-paper disabled:opacity-50"
              >
                {working ? (
                  <Icon
                    name="progress_activity"
                    size={15}
                    className="animate-spin text-paper"
                  />
                ) : (
                  <Icon name="check" size={15} className="text-paper" />
                )}
                Log
              </PressButton>
            </div>
          );
        })}
      </div>
    </section>
  );
}
