-- ---------------------------------------------------------------------------
-- Migration 002 — a second currency, and subscriptions.
--
-- Run this in the Supabase SQL Editor once, on top of schema.sql. Every
-- statement is additive and idempotent, so re-running it is safe and no
-- existing row changes meaning.
--
-- The ledger stays single-currency: `expenses.amount` remains LKR, so every
-- total, budget and report keeps working untouched. What is added is a record
-- of what was actually typed, for the entries made abroad.
-- ---------------------------------------------------------------------------

-- The currency to offer alongside LKR when adding an expense. Null means the
-- user has not picked one, and the app stays single-currency for them.
alter table public.profiles
  add column if not exists secondary_currency text
    check (secondary_currency is null or secondary_currency ~ '^[A-Z]{3}$');

-- What the user actually entered, before conversion. Null for the ordinary
-- case where the entry was already in LKR.
alter table public.expenses
  add column if not exists original_amount numeric(12,2)
    check (original_amount is null or original_amount > 0);

alter table public.expenses
  add column if not exists original_currency text
    check (original_currency is null or original_currency ~ '^[A-Z]{3}$');

-- The two are only meaningful together: an amount with no currency cannot be
-- displayed, and a currency with no amount says nothing.
alter table public.expenses
  drop constraint if exists expenses_original_pair;

alter table public.expenses
  add constraint expenses_original_pair
    check (
      (original_amount is null and original_currency is null)
      or (original_amount is not null and original_currency is not null)
    );

-- ---------------------------------------------------------------------------
-- Subscriptions — the recurring charges.
--
-- Kept separate from `expenses` on purpose: a subscription is a *schedule*,
-- not a transaction. Netflix billing monthly is one row here, and each time it
-- is charged it becomes an ordinary expense. Modelling it as a repeating
-- expense instead would either double-count the totals or require every report
-- to know about recurrence.
-- ---------------------------------------------------------------------------
create table if not exists public.subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid          not null references auth.users (id) on delete cascade,
  name        text          not null
                check (char_length(trim(name)) between 1 and 60),
  -- Deleting a category leaves the subscription; it just loses its grouping.
  category_id uuid          references public.categories (id) on delete set null,
  amount      numeric(12,2) not null check (amount > 0),
  -- Null means the ledger's own currency; a code means it bills in that one.
  currency    text          check (currency is null or currency ~ '^[A-Z]{3}$'),
  cadence     text          not null default 'monthly'
                check (cadence in ('weekly', 'monthly', 'yearly')),
  next_due    date          not null,
  -- Cancelled subscriptions are kept, not deleted: past expenses still refer
  -- to them and "what did I stop paying for" is a question worth answering.
  active      boolean       not null default true,
  created_at  timestamptz   not null default now()
);

create index if not exists subscriptions_user_due_idx
  on public.subscriptions (user_id, active, next_due);

alter table public.subscriptions enable row level security;

drop policy if exists "subscriptions are self-managed" on public.subscriptions;

create policy "subscriptions are self-managed"
  on public.subscriptions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
