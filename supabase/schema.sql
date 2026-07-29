-- ===========================================================================
--  SpentWise — database schema
--
--  Paste this whole file into the Supabase SQL Editor and run it once.
--  It is idempotent: re-running it is safe.
--
--  Everything is protected by Row Level Security, so the browser-side anon key
--  can only ever read or write rows belonging to the signed-in user.
-- ===========================================================================


-- ---------------------------------------------------------------------------
-- 1. profiles — one row per auth user, created automatically on sign-up
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id             uuid primary key references auth.users (id) on delete cascade,
  display_name   text,
  currency       text          not null default 'Rs.',
  monthly_budget numeric(12,2) not null default 0 check (monthly_budget >= 0),
  created_at     timestamptz   not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles are self-readable"  on public.profiles;
drop policy if exists "profiles are self-writable"  on public.profiles;
drop policy if exists "profiles are self-insertable" on public.profiles;

create policy "profiles are self-readable"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles are self-writable"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "profiles are self-insertable"
  on public.profiles for insert
  with check (auth.uid() = id);


-- ---------------------------------------------------------------------------
-- 2. categories — user-owned spending buckets
-- ---------------------------------------------------------------------------
create table if not exists public.categories (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid          not null references auth.users (id) on delete cascade,
  name           text          not null check (char_length(trim(name)) between 1 and 40),
  icon           text          not null default 'more_horiz',
  tone           text          not null default 'slate'
                   check (tone in ('blue','teal','rose','amber','violet','slate')),
  monthly_budget numeric(12,2) check (monthly_budget is null or monthly_budget >= 0),
  sort_order     int           not null default 0,
  created_at     timestamptz   not null default now(),
  -- Two categories with the same name would make the reports ambiguous.
  unique (user_id, name)
);

create index if not exists categories_user_idx
  on public.categories (user_id, sort_order);

alter table public.categories enable row level security;

drop policy if exists "categories are self-managed" on public.categories;

create policy "categories are self-managed"
  on public.categories for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- ---------------------------------------------------------------------------
-- 3. expenses — the ledger
-- ---------------------------------------------------------------------------
create table if not exists public.expenses (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid          not null references auth.users (id) on delete cascade,
  -- Deleting a category keeps its expenses; they just fall to "Uncategorised".
  category_id uuid          references public.categories (id) on delete set null,
  amount      numeric(12,2) not null check (amount > 0),
  note        text          check (note is null or char_length(note) <= 280),
  spent_at    date          not null default current_date,
  created_at  timestamptz   not null default now()
);

-- The dashboard and reports both read "this user, this date range, newest
-- first", so the index is ordered to match.
create index if not exists expenses_user_date_idx
  on public.expenses (user_id, spent_at desc, created_at desc);

create index if not exists expenses_category_idx
  on public.expenses (category_id);

alter table public.expenses enable row level security;

drop policy if exists "expenses are self-managed" on public.expenses;

create policy "expenses are self-managed"
  on public.expenses for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- ---------------------------------------------------------------------------
-- 4. Monthly totals per category, computed in Postgres
--
--    Doing the GROUP BY here rather than in JavaScript keeps the payload tiny,
--    which matters on the free tier's shared egress budget.
-- ---------------------------------------------------------------------------
create or replace function public.category_totals(
  from_date date,
  to_date   date
)
returns table (
  category_id    uuid,
  category_name  text,
  icon           text,
  tone           text,
  monthly_budget numeric,
  total          numeric,
  entries        bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    c.id,
    c.name,
    c.icon,
    c.tone,
    c.monthly_budget,
    coalesce(sum(e.amount), 0) as total,
    count(e.id)                as entries
  from public.categories c
  left join public.expenses e
    on e.category_id = c.id
   and e.spent_at between from_date and to_date
   and e.user_id = auth.uid()
  where c.user_id = auth.uid()
  group by c.id, c.name, c.icon, c.tone, c.monthly_budget, c.sort_order
  order by total desc, c.sort_order asc;
$$;


-- ---------------------------------------------------------------------------
-- 5. Sign-up trigger — seed a profile and a starter set of categories
--
--    Runs as SECURITY DEFINER because at this point in the sign-up flow there
--    is no `auth.uid()` yet, so RLS would block the inserts.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'display_name',
      split_part(new.email, '@', 1)
    )
  )
  on conflict (id) do nothing;

  insert into public.categories (user_id, name, icon, tone, sort_order)
  values
    (new.id, 'Food',      'restaurant',     'blue',   1),
    (new.id, 'Transport', 'directions_car', 'teal',   2),
    (new.id, 'Shopping',  'shopping_bag',   'violet', 3),
    (new.id, 'Bills',     'receipt_long',   'amber',  4),
    (new.id, 'Health',    'medical_services', 'rose', 5),
    (new.id, 'Other',     'more_horiz',     'slate',  6)
  on conflict (user_id, name) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ---------------------------------------------------------------------------
-- 6. Backfill — gives any account that existed before this script a profile
--    and the default categories.
-- ---------------------------------------------------------------------------
insert into public.profiles (id, display_name)
select u.id, split_part(u.email, '@', 1)
from auth.users u
on conflict (id) do nothing;

insert into public.categories (user_id, name, icon, tone, sort_order)
select u.id, d.name, d.icon, d.tone, d.sort_order
from auth.users u
cross join (values
  ('Food',      'restaurant',       'blue',   1),
  ('Transport', 'directions_car',   'teal',   2),
  ('Shopping',  'shopping_bag',     'violet', 3),
  ('Bills',     'receipt_long',     'amber',  4),
  ('Health',    'medical_services', 'rose',   5),
  ('Other',     'more_horiz',       'slate',  6)
) as d(name, icon, tone, sort_order)
on conflict (user_id, name) do nothing;
