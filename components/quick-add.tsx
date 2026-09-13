"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Icon } from "@/components/icon";
import { PressButton } from "@/components/pressable";
import { toneOf } from "@/lib/categories";
import { formatMoney } from "@/lib/format";
import { deleteExpense, quickAdd } from "@/app/add/actions";
import type { QuickPick } from "@/lib/queries";

/**
 * One-tap repeats of the things this person logs constantly.
 *
 * Adding a recurring expense the long way is seven taps: open, four digits,
 * category, save. Since most spending *is* recurring, those seven taps are the
 * app's dominant cost. Each button here collapses them into one.
 *
 * Undo is attached rather than a confirm step, because a wrong tap must cost
 * less than the confirmation would have cost on every right tap.
 */
export function QuickAdd({ picks, currency }: { picks: QuickPick[]; currency: string }) {
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);

  if (picks.length === 0) return null;

  function add(pick: QuickPick) {
    const key = `${pick.categoryId}:${pick.amount}`;
    setBusy(key);

    startTransition(async () => {
      const { error, id } = await quickAdd(pick.categoryId, pick.amount);
      setBusy(null);

      if (error || !id) {
        toast.error(error ?? "Couldn't save that.");
        return;
      }

      toast(`${pick.categoryName} · ${formatMoney(pick.amount, currency, { compact: true })}`, {
        description: "Added to today",
        // Undo is the only route back from a destructive tap, so it gets
        // longer than Sonner's four-second default — long enough to notice the
        // toast, read it, and decide, rather than to merely glimpse it.
        duration: 8000,
        action: {
          label: "Undo",
          onClick: () => {
            void deleteExpense(id).then(({ error: removeError, deleted }) => {
              if (removeError) toast.error(removeError);
              // Nothing to restore: the undo *is* the delete. Keeping the row
              // here would only matter if we offered a redo, and we don't.
              else if (!deleted) toast.error("Couldn't undo that.");
            });
          },
        },
      });
    });
  }

  return (
    <section className="pt-4">
      <h2 className="flex items-center gap-1.5 pb-3 text-label uppercase text-ink-faint">
        <Icon name="bolt" size={14} aria-hidden />
        Quick add
      </h2>

      <div className="grid grid-cols-2 gap-2">
        {picks.map((pick) => {
          const key = `${pick.categoryId}:${pick.amount}`;
          const tone = toneOf(pick.tone);

          return (
            <PressButton
              key={key}
              type="button"
              haptic
              disabled={pending}
              onClick={() => add(pick)}
              className="tap flex min-w-0 flex-col items-start gap-1.5 rounded-xl border
                border-line px-3 py-3 text-left disabled:opacity-50"
            >
              <span className="flex w-full items-center gap-1.5">
                <Icon
                  name={pick.icon}
                  size={16}
                  className="shrink-0"
                  style={{ color: tone.color }}
                />
                <span className="truncate text-meta text-ink-faint">
                  {pick.categoryName}
                </span>
                {busy === key ? (
                  <Icon
                    name="progress_activity"
                    size={13}
                    className="ml-auto animate-spin text-ink-faint"
                  />
                ) : null}
              </span>
              <span className="tabular truncate text-title text-ink">
                {formatMoney(pick.amount, currency, { compact: true })}
              </span>
            </PressButton>
          );
        })}
      </div>
    </section>
  );
}
