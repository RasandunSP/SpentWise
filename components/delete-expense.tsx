"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Icon } from "@/components/icon";
import { PressButton } from "@/components/pressable";
import { deleteExpense, restoreExpense } from "@/app/add/actions";

/**
 * Delete, with the escape hatch attached.
 *
 * The row disappears immediately and the undo lives in the toast, so the
 * common case — a deliberate delete — costs exactly one tap, and the rare
 * mistake costs one more. A confirmation dialog would have inverted that.
 */
export function DeleteExpense({
  id,
  name,
}: {
  id: string;
  name: string;
}) {
  const [pending, startTransition] = useTransition();

  function remove() {
    startTransition(async () => {
      const { error, deleted } = await deleteExpense(id);

      if (error || !deleted) {
        toast.error(error ?? "Couldn't delete that.");
        return;
      }

      toast(`${name} deleted`, {
        // Undo is the only route back from a destructive tap, so it gets
        // longer than Sonner's four-second default — long enough to notice the
        // toast, read it, and decide, rather than to merely glimpse it.
        duration: 8000,
        action: {
          label: "Undo",
          onClick: () => {
            // Not inside the transition above: that one has already settled by
            // the time the toast is on screen.
            void restoreExpense(deleted).then(({ error: restoreError }) => {
              if (restoreError) toast.error(restoreError);
            });
          },
        },
      });
    });
  }

  return (
    <PressButton
      type="button"
      onClick={remove}
      disabled={pending}
      aria-label={`Delete ${name} expense`}
      className="tap -mr-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-full
        text-ink-faint hover:bg-negative-soft hover:text-negative
        data-[pressed=true]:bg-negative-soft data-[pressed=true]:text-negative
        disabled:opacity-40"
    >
      <Icon name="close" size={18} />
    </PressButton>
  );
}
