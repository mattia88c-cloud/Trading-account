-- Trading Accounts / Stratton Account Manager — schema utenti (Supabase Postgres)
--
-- Da eseguire UNA VOLTA nel SQL editor del progetto Supabase (dashboard -> SQL Editor -> New query).
-- Sicuro da ri-eseguire: usa "if not exists" / "or replace" dove possibile.

-- ============================================================================
-- PROFILES — un profilo per ogni utente auth.users, con ruolo/stato/flag
-- ============================================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null default '',
  role text not null default 'user' check (role in ('user', 'admin')),
  status text not null default 'active' check (status in ('active', 'disabled')),
  must_change_password boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Un utente vede/aggiorna solo la propria riga...
drop policy if exists "profiles_self_select" on public.profiles;
create policy "profiles_self_select" on public.profiles
  for select using (id = auth.uid());

drop policy if exists "profiles_self_update" on public.profiles;
create policy "profiles_self_update" on public.profiles
  for update using (id = auth.uid());

-- ...l'Admin in più vede l'elenco di TUTTI i profili (serve per il pannello Gestione Account),
-- ma NON ha alcuna policy sulle tabelle dati sotto: questo è il confine di privacy.
--
-- La verifica "sono admin?" va fatta con una funzione security definer, MAI con una subquery
-- diretta su public.profiles dentro la policy stessa: una policy su profiles che interroga
-- profiles rientra nella valutazione RLS di se stessa e Postgres va in ricorsione infinita
-- (errore 500 lato client). Una funzione security definer di proprietà del superuser bypassa
-- l'RLS al suo interno, rompendo il ciclo.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

drop policy if exists "profiles_admin_select_all" on public.profiles;
create policy "profiles_admin_select_all" on public.profiles
  for select using (public.is_admin());

-- Crea automaticamente il profilo quando un nuovo utente viene creato (via Admin API, Stadio C)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username)
  values (new.id, coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- Helper: tabelle dati con user_id + RLS "solo il proprietario, senza eccezioni per admin"
-- ============================================================================

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  name text not null,
  type text not null default 'personal',
  initial_balance numeric not null,
  max_drawdown numeric not null default 0,
  color text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  date date not null,
  profit numeric not null default 0,
  trades_opened integer,
  trades_effective integer,
  side text,
  duration_minutes integer,
  entry_time text,
  exit_time text,
  market text,
  initial_size_micro numeric,
  final_size_micro numeric,
  initial_risk numeric,
  final_risk numeric,
  re_entry boolean default false,
  has_news boolean default false,
  open_session text,
  close_session text,
  followed_strategy boolean default true,
  risk_reward numeric,
  outcome text,
  close_type text,
  grade text,
  emotional_state text,
  confidence_level integer,
  mistake text,
  what_went_well text,
  lesson text,
  tags text[] default '{}',
  risk_points numeric,
  result_points numeric,
  chart_url text,
  -- Overtrading Mode
  overtrading_day boolean default false,
  estimated_trade_count integer,
  lost_control_at_trade integer,
  main_trigger text,
  data_quality text,
  quick_note text,
  tomorrow_correction text,
  created_at timestamptz not null default now(),
  unique (account_id, date)
);

-- Il progetto era già live quando è stato aggiunto chart_url: "create table if not exists" sopra
-- non tocca una tabella già esistente, serve questa alter esplicita per chi ha già fatto il deploy.
alter table public.entries add column if not exists chart_url text;

create table if not exists public.payouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  date date not null,
  amount numeric not null,
  created_at timestamptz not null default now()
);

create table if not exists public.missions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  type text not null,
  account_ids uuid[] not null default '{}',
  start_date date not null,
  duration_days integer not null,
  problem_description text,
  goal text,
  rules_text text,
  manual_status text check (manual_status in ('completed', 'failed') or manual_status is null),
  created_at timestamptz not null default now()
);

alter table public.accounts enable row level security;
alter table public.entries enable row level security;
alter table public.payouts enable row level security;
alter table public.missions enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['accounts', 'entries', 'payouts', 'missions']
  loop
    execute format('drop policy if exists "%1$s_owner_all" on public.%1$s', t);
    execute format(
      'create policy "%1$s_owner_all" on public.%1$s for all using (user_id = auth.uid()) with check (user_id = auth.uid())',
      t
    );
  end loop;
end $$;

-- ============================================================================
-- Indici utili
-- ============================================================================
create index if not exists entries_user_date_idx on public.entries (user_id, date);
create index if not exists entries_account_idx on public.entries (account_id);
create index if not exists payouts_account_idx on public.payouts (account_id);

-- ============================================================================
-- Admin — elenco utenti per il pannello Gestione Account (Stadio C)
-- ============================================================================
-- security definer: bypassa l'RLS di profiles e legge anche auth.users (schema non esposto
-- via PostgREST) solo per leggere email/last_sign_in_at, ma solo se il chiamante è admin
-- (altrimenti la WHERE azzera il risultato per chiunque altro).
create or replace function public.admin_list_users()
returns table (
  id uuid,
  email text,
  username text,
  role text,
  status text,
  must_change_password boolean,
  last_sign_in_at timestamptz,
  created_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select p.id, u.email, p.username, p.role, p.status, p.must_change_password, u.last_sign_in_at, p.created_at
  from public.profiles p
  join auth.users u on u.id = p.id
  where public.is_admin()
  order by p.created_at asc;
$$;

grant execute on function public.admin_list_users() to authenticated;

-- ============================================================================
-- Friends — classifica condivisa tra utenti (opt-in, solo aggregati)
-- ============================================================================
-- A differenza di accounts/entries/payouts/missions (isolamento totale, MAI condivisi),
-- questa tabella esiste apposta per essere letta da tutti: ogni utente ci scrive SOLO i
-- numeri già aggregati che ha scelto di condividere (% e $ giornalieri/settimanali, saldo,
-- numero conti, score disciplina, missioni concluse) — mai singoli trade, note, stato emotivo.
create table if not exists public.leaderboard_stats (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null default '',
  balance numeric not null default 0,
  account_count integer not null default 0,
  daily_pct jsonb not null default '[]'::jsonb,
  weekly_profit numeric not null default 0,
  discipline_score integer,
  missions_summary jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.leaderboard_stats enable row level security;

drop policy if exists "leaderboard_stats_select_all" on public.leaderboard_stats;
create policy "leaderboard_stats_select_all" on public.leaderboard_stats
  for select using (auth.uid() is not null);

drop policy if exists "leaderboard_stats_owner_insert" on public.leaderboard_stats;
create policy "leaderboard_stats_owner_insert" on public.leaderboard_stats
  for insert with check (user_id = auth.uid());

drop policy if exists "leaderboard_stats_owner_update" on public.leaderboard_stats;
create policy "leaderboard_stats_owner_update" on public.leaderboard_stats
  for update using (user_id = auth.uid());
