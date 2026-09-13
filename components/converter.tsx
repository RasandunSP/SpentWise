"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/icon";
import { PressButton } from "@/components/pressable";
import { currencyName, groupCurrencies } from "@/lib/currencies";
import { formatCurrency } from "@/lib/format";

/**
 * Convert between any two quoted currencies.
 *
 * Every rate for the day arrives with the page as one object, so each keystroke
 * is arithmetic on numbers already in memory — no request, no spinner, no
 * debounce. The provider publishes once a day; asking it again per keystroke
 * would be slower and would spend the quota to get the identical answer.
 */
export function Converter({
  rates,
  updatedAt,
  initialFrom,
  initialTo,
}: {
  rates: Record<string, number>;
  updatedAt: string;
  initialFrom: string;
  initialTo: string;
}) {
  const [amount, setAmount] = useState("");
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);

  const codes = useMemo(() => Object.keys(rates), [rates]);
  const { common, rest } = useMemo(() => groupCurrencies(codes), [codes]);

  const value = Number(amount.replace(/,/g, ""));
  const hasAmount = amount.trim() !== "" && Number.isFinite(value) && value > 0;

  // Rates share a base, so crossing two of them is one ratio.
  const fromRate = rates[from];
  const toRate = rates[to];
  const converted =
    hasAmount && fromRate && toRate ? (value / fromRate) * toRate : null;

  // The unit rate is worth more than the answer while travelling: it is the
  // number you carry in your head to sanity-check a price on a menu.
  const unit = fromRate && toRate ? toRate / fromRate : null;

  function swap() {
    setFrom(to);
    setTo(from);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <label
          htmlFor="convert-amount"
          className="text-label uppercase text-ink-faint"
        >
          Amount
        </label>
        <input
          id="convert-amount"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={amount}
          onChange={(event) =>
            setAmount(event.target.value.replace(/[^\d.,]/g, ""))
          }
          placeholder="0"
          className="tabular mt-2 w-full border-0 border-b border-line bg-transparent px-0
            pb-3 text-figure font-light text-ink placeholder:text-ink-faint
            focus:border-accent focus:outline-none"
        />
      </div>

      <div className="flex items-end gap-3">
        <Picker
          id="convert-from"
          label="From"
          value={from}
          onChange={setFrom}
          common={common}
          rest={rest}
        />

        <PressButton
          type="button"
          onClick={swap}
          aria-label="Swap currencies"
          className="tap mb-1 flex h-10 w-10 shrink-0 items-center justify-center
            rounded-full border border-line text-ink-muted"
        >
          <Icon name="swap_horiz" size={19} />
        </PressButton>

        <Picker
          id="convert-to"
          label="To"
          value={to}
          onChange={setTo}
          common={common}
          rest={rest}
        />
      </div>

      <div className="rounded-xl bg-ink px-6 pb-7 pt-6">
        <span className="text-label uppercase text-paper/50">
          {currencyName(to)}
        </span>
        <p className="tabular pt-4 text-figure text-paper">
          {converted === null ? "—" : formatCurrency(converted, to)}
        </p>
        {unit ? (
          <p className="tabular pt-3 text-meta text-paper/55">
            1 {from} = {unit.toLocaleString("en-US", {
              maximumFractionDigits: unit < 1 ? 6 : 4,
            })}{" "}
            {to}
          </p>
        ) : null}
      </div>

      <p className="text-meta text-ink-faint">
        Rates from {new Date(updatedAt).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })}
        , refreshed daily.
      </p>
    </div>
  );
}

function Picker({
  id,
  label,
  value,
  onChange,
  common,
  rest,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (code: string) => void;
  common: string[];
  rest: string[];
}) {
  return (
    <div className="min-w-0 flex-1">
      <label htmlFor={id} className="text-label uppercase text-ink-faint">
        {label}
      </label>
      {/* A native select: it is one tag, it is searchable by typing on a
          desktop, and on a phone it opens the platform's own wheel — which is
          a better 166-item picker than anything worth hand-building here. */}
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full appearance-none border-0 border-b border-line bg-transparent
          px-0 pb-2.5 text-title text-ink focus:border-accent focus:outline-none"
      >
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
    </div>
  );
}
