"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Icon } from "@/components/icon";
import { TextField } from "@/components/text-field";
import { PressButton } from "@/components/pressable";
import { HoldToDelete } from "@/components/hold-to-delete";
import { toneOf } from "@/lib/categories";
import { currencyName, groupCurrencies } from "@/lib/currencies";
import { formatCurrency, formatMoney, todayIso } from "@/lib/format";
import { CADENCES, cadencePer, dueLabel, dueState } from "@/lib/subscriptions";
import type { SettingsState } from "@/app/(app)/settings/actions";
import {
  createSubscription,
  deleteSubscription,
  setSubscriptionActive,
  updateSubscription,
} from "@/app/(app)/settings/subscription-actions";
import type {
  Category,
  SubscriptionWithCategory,
} from "@/lib/supabase/types";

const EMPTY: SettingsState = {};

/**
 * The subscription list, where the schedule is kept.
 *
 * Setting one up is a once-a-year act and acting on it is a monthly one, which
 * is why the two are in different places: this screen is the filing cabinet,
 * and Home carries only what is actually due. Cancelled ones stay in the list,
 * greyed, because "what did I stop paying for" is worth being able to answer —
 * and because a service cancelled by mistake should be one tap from coming
 * back rather than a re-entry from memory.
 */
export function SubscriptionsManager({
  subscriptions,
  categories,
  currency,
  currencyCodes,
  primaryCode,
  monthlyCommitted,
}: {
  subscriptions: SubscriptionWithCategory[];
  categories: Category[];
  /** The user's display symbol for the ledger currency, e.g. "Rs.". */
  currency: string;
  /** Every code the rate provider quotes; empty when rates are unavailable. */
  currencyCodes: string[];
  primaryCode: string;
  /** Committed spend per month, converted; null when it cannot be totalled. */
  monthlyCommitted: number | null;
}) {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function setActive(subscription: SubscriptionWithCategory, active: boolean) {
    startTransition(async () => {
      const { error } = await setSubscriptionActive(subscription.id, active);
      if (error) toast.error(error);
      else {
        toast(
          active
            ? `${subscription.name} resumed`
            : `${subscription.name} cancelled`,
          {
            description: active
              ? undefined
              : "Kept in the list, and no longer counted.",
          },
        );
      }
    });
  }

  return (
    <div className="flex flex-col">
      {subscriptions.length === 0 ? (
        <p className="text-body text-ink-faint">
          Nothing recurring yet. Adding one puts it on Home the week it is due.
        </p>
      ) : (
        <ul className="flex flex-col">
          {subscriptions.map((subscription) => {
            const tone = toneOf(subscription.category?.tone);
            const isEditing = editing === subscription.id;
            const overdue =
              subscription.active && dueState(subscription.next_due) === "overdue";

            return (
              <li
                key={subscription.id}
                className="border-b border-line py-3.5 last:border-b-0"
              >
                <div className="flex items-center gap-3">
                  <Icon
                    name={subscription.category?.icon ?? "autorenew"}
                    size={19}
                    className="shrink-0"
                    style={{
                      color: subscription.active ? tone.color : undefined,
                    }}
                  />

                  <div className="min-w-0 flex-1">
                    <p
                      className={`truncate text-body ${
                        subscription.active ? "text-ink" : "text-ink-faint line-through"
                      }`}
                    >
                      {subscription.name}
                    </p>
                    <p
                      className={`truncate pt-0.5 text-meta ${
                        overdue ? "text-negative" : "text-ink-faint"
                      }`}
                    >
                      {subscription.currency
                        ? formatCurrency(
                            Number(subscription.amount),
                            subscription.currency,
                            { compact: true },
                          )
                        : formatMoney(Number(subscription.amount), currency, {
                            compact: true,
                          })}{" "}
                      {cadencePer(subscription.cadence)}
                      {subscription.active
                        ? ` · ${dueLabel(subscription.next_due)}`
                        : " · cancelled"}
                    </p>
                  </div>

                  <PressButton
                    type="button"
                    onClick={() =>
                      setEditing(isEditing ? null : subscription.id)
                    }
                    aria-expanded={isEditing}
                    aria-label={`Edit ${subscription.name}`}
                    className="tap flex h-9 w-9 shrink-0 items-center justify-center
                      rounded-full text-ink-faint"
                  >
                    <Icon name={isEditing ? "expand_less" : "edit"} size={17} />
                  </PressButton>

                  <PressButton
                    type="button"
                    disabled={pending}
                    onClick={() => setActive(subscription, !subscription.active)}
                    aria-label={
                      subscription.active
                        ? `Cancel ${subscription.name}`
                        : `Resume ${subscription.name}`
                    }
                    title={subscription.active ? "Cancel" : "Resume"}
                    className="tap flex h-9 w-9 shrink-0 items-center justify-center
                      rounded-full text-ink-faint disabled:opacity-40"
                  >
                    <Icon
                      name={subscription.active ? "pause" : "play_arrow"}
                      size={17}
                    />
                  </PressButton>

                  <HoldToDelete
                    name={subscription.name}
                    onConfirm={async () => {
                      const error = await deleteSubscription(subscription.id);
                      if (!error) setEditing(null);
                      return error;
                    }}
                  />
                </div>

                {isEditing ? (
                  <EditForm
                    subscription={subscription}
                    categories={categories}
                    currencyCodes={currencyCodes}
                    primaryCode={primaryCode}
                    onDone={() => setEditing(null)}
                  />
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      {monthlyCommitted !== null && monthlyCommitted > 0 ? (
        <p className="pt-3 text-meta text-ink-faint">
          {formatMoney(monthlyCommitted, currency, { compact: true })} a month
          committed — weekly and yearly charges counted at their monthly
          equivalent.
        </p>
      ) : null}

      {creating ? (
        <NewForm
          categories={categories}
          currencyCodes={currencyCodes}
          primaryCode={primaryCode}
          onDone={() => setCreating(false)}
        />
      ) : (
        <PressButton
          type="button"
          onClick={() => setCreating(true)}
          className="tap flex items-center gap-2 self-start pt-5 text-body text-accent"
        >
          <Icon name="add" size={18} className="text-accent" />
          New subscription
        </PressButton>
      )}
    </div>
  );
}

function Feedback({ state }: { state: SettingsState }) {
  if (state.error) {
    return (
      <p role="alert" className="text-meta text-negative">
        {state.error}
      </p>
    );
  }
  if (state.notice) {
    return (
      <p role="status" className="text-meta text-positive">
        {state.notice}
      </p>
    );
  }
  return null;
}

/**
 * The fields, shared by both forms.
 *
 * One definition rather than two, because an edit that offered a different set
 * of choices from the original — or validated them differently — is how the
 * two drift into disagreeing about what a subscription is.
 */
function Fields({
  categories,
  currencyCodes,
  primaryCode,
  subscription,
}: {
  categories: Category[];
  currencyCodes: string[];
  primaryCode: string;
  subscription?: SubscriptionWithCategory;
}) {
  const { common, rest } = groupCurrencies(
    currencyCodes.filter((code) => code !== primaryCode),
  );

  const selectClass =
    "w-full appearance-none border-0 border-b border-line bg-transparent px-0 pb-2.5 pt-1.5 " +
    "text-title text-ink focus:border-accent focus:outline-none";

  return (
    <>
      <TextField
        label="Name"
        name="name"
        required
        maxLength={60}
        placeholder="e.g. Netflix"
        defaultValue={subscription?.name ?? ""}
      />

      <div className="grid grid-cols-2 gap-5">
        <TextField
          label="Amount"
          name="amount"
          type="text"
          inputMode="decimal"
          required
          className="tabular"
          placeholder="0"
          defaultValue={
            subscription ? String(Number(subscription.amount)) : ""
          }
        />

        <div className="flex flex-col gap-1">
          <label
            htmlFor={fieldId(subscription, "cadence")}
            className="text-label uppercase text-ink-faint"
          >
            Repeats
          </label>
          <select
            id={fieldId(subscription, "cadence")}
            name="cadence"
            defaultValue={subscription?.cadence ?? "monthly"}
            className={selectClass}
          >
            {CADENCES.map((cadence) => (
              <option key={cadence.key} value={cadence.key}>
                {cadence.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label
          htmlFor={fieldId(subscription, "next_due")}
          className="text-label uppercase text-ink-faint"
        >
          Next charged
        </label>
        <input
          id={fieldId(subscription, "next_due")}
          name="next_due"
          type="date"
          required
          defaultValue={subscription?.next_due ?? todayIso()}
          className="tabular w-full border-0 border-b border-line bg-transparent px-0
            pb-2.5 pt-1.5 text-title text-ink focus:border-accent focus:outline-none"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label
          htmlFor={fieldId(subscription, "category_id")}
          className="text-label uppercase text-ink-faint"
        >
          Category
        </label>
        <select
          id={fieldId(subscription, "category_id")}
          name="category_id"
          defaultValue={subscription?.category_id ?? ""}
          className={selectClass}
        >
          <option value="">Uncategorised</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        <p className="pt-1.5 text-meta text-ink-faint">
          What the logged expense is filed under.
        </p>
      </div>

      {currencyCodes.length > 0 ? (
        <div className="flex flex-col gap-1">
          <label
            htmlFor={fieldId(subscription, "currency")}
            className="text-label uppercase text-ink-faint"
          >
            Billed in
          </label>
          <select
            id={fieldId(subscription, "currency")}
            name="currency"
            defaultValue={subscription?.currency ?? ""}
            className={selectClass}
          >
            <option value="">{primaryCode} — your own currency</option>
            <optgroup label="Common">
              {common.map((code) => (
                <option key={code} value={code}>
                  {code} · {currencyName(code)}
                </option>
              ))}
            </optgroup>
            <optgroup label="All currencies">
              {rest.map((code) => (
                <option key={code} value={code}>
                  {code} · {currencyName(code)}
                </option>
              ))}
            </optgroup>
          </select>
          <p className="pt-1.5 text-meta text-ink-faint">
            Converted at the day&apos;s rate each time you log it.
          </p>
        </div>
      ) : (
        // Rates are unavailable: keep whatever was chosen rather than silently
        // resetting a foreign subscription to the ledger's currency on save.
        <input
          type="hidden"
          name="currency"
          value={subscription?.currency ?? ""}
        />
      )}
    </>
  );
}

/** Ids must be unique per form — several can be open at once. */
function fieldId(
  subscription: SubscriptionWithCategory | undefined,
  name: string,
): string {
  return subscription ? `${name}-${subscription.id}` : `new-${name}`;
}

function NewForm({
  categories,
  currencyCodes,
  primaryCode,
  onDone,
}: {
  categories: Category[];
  currencyCodes: string[];
  primaryCode: string;
  onDone: () => void;
}) {
  const [state, action, pending] = useActionState(createSubscription, EMPTY);

  // Close on success, and say so in a toast instead.
  //
  // Leaving the form open with its values still in it is how one subscription
  // becomes two: the notice reads as confirmation, but the button underneath
  // it is still armed with the same Netflix.
  useEffect(() => {
    if (!state.notice) return;
    toast(state.notice, { description: "It will appear on Home when it is due." });
    onDone();
  }, [state.notice, onDone]);

  return (
    <form
      action={action}
      className="flex flex-col gap-7 border-t border-line pt-6"
    >
      <Fields
        categories={categories}
        currencyCodes={currencyCodes}
        primaryCode={primaryCode}
      />

      <Feedback state={state} />

      <div className="flex items-center gap-2">
        <PressButton
          type="submit"
          disabled={pending}
          className="tap flex h-12 flex-1 items-center justify-center gap-2 rounded-full
            bg-ink text-title text-paper disabled:opacity-50"
        >
          {pending ? (
            <Icon
              name="progress_activity"
              size={18}
              className="animate-spin text-paper"
            />
          ) : null}
          Add subscription
        </PressButton>
        <PressButton
          type="button"
          onClick={onDone}
          className="tap h-12 px-5 text-body text-ink-faint"
        >
          Cancel
        </PressButton>
      </div>
    </form>
  );
}

function EditForm({
  subscription,
  categories,
  currencyCodes,
  primaryCode,
  onDone,
}: {
  subscription: SubscriptionWithCategory;
  categories: Category[];
  currencyCodes: string[];
  primaryCode: string;
  onDone: () => void;
}) {
  const [state, action, pending] = useActionState(
    updateSubscription.bind(null, subscription.id),
    EMPTY,
  );

  return (
    <form action={action} className="flex flex-col gap-7 pb-2 pt-6">
      <Fields
        subscription={subscription}
        categories={categories}
        currencyCodes={currencyCodes}
        primaryCode={primaryCode}
      />

      <Feedback state={state} />

      <div className="flex items-center gap-2">
        <PressButton
          type="submit"
          disabled={pending}
          className="tap flex h-12 flex-1 items-center justify-center gap-2 rounded-full
            bg-ink text-title text-paper disabled:opacity-50"
        >
          {pending ? (
            <Icon
              name="progress_activity"
              size={18}
              className="animate-spin text-paper"
            />
          ) : null}
          Save
        </PressButton>
        <PressButton
          type="button"
          onClick={onDone}
          className="tap h-12 px-5 text-body text-ink-faint"
        >
          Done
        </PressButton>
      </div>
    </form>
  );
}
