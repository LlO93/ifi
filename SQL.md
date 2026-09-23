begin;

-- =========================================================
-- 투자 IF / MVP 초기 테이블
-- 미국 주식 · USD · 세금 미반영
--
-- 기존 테이블을 변경하거나 삭제하지 않습니다.
-- 같은 이름의 테이블이 있으면 실행을 중단합니다.
-- 전체 작업은 하나의 트랜잭션으로 실행됩니다.
-- =========================================================

-- 1. 종목 정보
create table public.investment_instruments (
  id uuid primary key default gen_random_uuid(),
  ticker text not null,
  name text not null,
  exchange text not null,
  currency text not null default 'USD'
    check (currency = 'USD'),
  instrument_type text not null default 'stock'
    check (instrument_type in ('stock', 'etf')),
  industry text,
  sector text,
  active_from date,
  active_to date,
  simulation_supported boolean not null default true,
  unsupported_reason text,
  created_at timestamptz not null default now(),

  unique (exchange, ticker),
  check (length(trim(ticker)) > 0),
  check (length(trim(name)) > 0),
  check (
    active_from is null
    or active_to is null
    or active_to >= active_from
  )
);

-- 2. 일별 시세
-- 배당 재투자를 포함한 수정주가가 아닌 원시 종가를 저장합니다.
create table public.investment_daily_prices (
  instrument_id uuid not null
    references public.investment_instruments(id),
  trading_date date not null,
  raw_close numeric(24, 8) not null
    check (raw_close > 0 and raw_close < 'Infinity'::numeric),
  volume bigint check (volume >= 0),
  market_cap numeric(30, 2)
    check (market_cap >= 0 and market_cap < 'Infinity'::numeric),
  currency text not null default 'USD'
    check (currency = 'USD'),
  provider text not null,
  revision text,
  fetched_at timestamptz not null default now(),

  primary key (instrument_id, trading_date)
);

-- 3. 기업행동
-- 분할은 split_ratio 사용. 나머지는 details에 공급자 정보 보관.
create table public.investment_corporate_actions (
  id uuid primary key default gen_random_uuid(),
  instrument_id uuid not null
    references public.investment_instruments(id),
  effective_date date not null,
  action_type text not null
    check (
      action_type in (
        'split', 'merger', 'spinoff',
        'delisting', 'symbol_change', 'other'
      )
    ),
  split_ratio numeric(24, 10),
  details jsonb not null default '{}'::jsonb
    check (jsonb_typeof(details) = 'object'),
  provider text not null,
  provider_event_id text not null,
  revision text,
  fetched_at timestamptz not null default now(),

  unique (provider, provider_event_id),
  check (
    (
      action_type = 'split'
      and split_ratio is not null
      and split_ratio > 0
      and split_ratio < 'Infinity'::numeric
    )
    or
    (action_type <> 'split' and split_ratio is null)
  )
);

-- 4. 순위
-- 한 행이 특정 날짜·지표의 한 종목 순위입니다.
create table public.investment_rankings (
  as_of_date date not null,
  metric text not null
    check (metric in ('volume', 'market_cap')),
  instrument_id uuid not null
    references public.investment_instruments(id),
  rank integer not null check (rank > 0),
  metric_value numeric(30, 2) not null
    check (
      metric_value >= 0
      and metric_value < 'Infinity'::numeric
    ),
  provider text not null,
  generated_at timestamptz not null default now(),

  primary key (as_of_date, metric, instrument_id),
  unique (as_of_date, metric, rank)
);

-- 5. 과거 자금 기록
-- positions: 종목별 instrument_id, quantity를 담는 JSON 배열.
-- 금액·수량은 앱에서 손실 없는 숫자 문자열로 직렬화할 수 있습니다.
create table public.investment_asset_snapshots (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid()
    references auth.users(id) on delete cascade,
  effective_date date not null,
  currency text not null default 'USD'
    check (currency = 'USD'),
  cash numeric(24, 8) not null default 0
    check (cash >= 0 and cash < 'Infinity'::numeric),
  positions jsonb not null default '[]'::jsonb
    check (jsonb_typeof(positions) = 'array'),
  label text check (char_length(label) <= 100),
  created_at timestamptz not null default now(),

  unique (id, owner_id)
);

-- 6. 가상 투자 조건
-- positions: instrument_id, held_qty, sell_qty를 담는 JSON 배열.
-- 자금 기록을 불러와도 현금·수량은 이 표에 복사해 저장합니다.
-- 따라서 원래 자금 기록을 편집해도 기존 시나리오는 바뀌지 않습니다.
create table public.investment_scenarios (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid()
    references auth.users(id) on delete cascade,

  target_instrument_id uuid not null
    references public.investment_instruments(id),

  requested_date date not null,
  effective_date date not null,

  source_mode text not null
    check (source_mode in ('cash', 'stocks', 'mixed')),

  currency text not null default 'USD'
    check (currency = 'USD'),
  cash numeric(24, 8) not null default 0
    check (cash >= 0 and cash < 'Infinity'::numeric),

  positions jsonb not null default '[]'::jsonb
    check (jsonb_typeof(positions) = 'array'),

  budget_mode text not null
    check (budget_mode in ('percent', 'amount')),
  budget_value numeric(24, 8) not null
    check (
      budget_value > 0
      and budget_value < 'Infinity'::numeric
    ),

  -- 同じ利用者の記録だけを参照できる複合外部キーです。
  source_snapshot_id uuid,
  parent_scenario_id uuid,

  -- 同一利用者の二重送信を防ぐため、アプリからUUIDを渡します。
  idempotency_key uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),

  unique (id, owner_id),
  unique (owner_id, idempotency_key),

  foreign key (source_snapshot_id, owner_id)
    references public.investment_asset_snapshots(id, owner_id)
    on delete set null (source_snapshot_id),

  foreign key (parent_scenario_id, owner_id)
    references public.investment_scenarios(id, owner_id)
    on delete set null (parent_scenario_id),

  check (effective_date >= requested_date),
  check (parent_scenario_id is null or parent_scenario_id <> id),
  check (budget_mode <> 'percent' or budget_value <= 100),

  check (
    (source_mode = 'cash'
      and cash > 0
      and jsonb_array_length(positions) = 0)
    or
    (source_mode = 'stocks'
      and cash = 0
      and jsonb_array_length(positions) > 0)
    or
    (source_mode = 'mixed'
      and cash > 0
      and jsonb_array_length(positions) > 0)
  )
);

-- 7. 계산 결과 이력
-- 최신 기준 재계산은 기존 행 수정 대신 새 행 INSERT로 구현합니다.
-- inputs_snapshot에는 계산 당시 입력 조건 전체를 저장합니다.
-- 가격과 분할 정보도 저장하므로 당시 결과를 다시 확인할 수 있습니다.
create table public.investment_evaluations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid()
    references auth.users(id) on delete cascade,

  scenario_id uuid not null,
  valuation_date date not null,
  evaluated_at timestamptz not null default now(),

  currency text not null default 'USD'
    check (currency = 'USD'),
  engine_version text not null,
  data_revision text,

  inputs_snapshot jsonb not null
    check (jsonb_typeof(inputs_snapshot) = 'object'),
  price_inputs jsonb not null
    check (jsonb_typeof(price_inputs) = 'array'),
  split_inputs jsonb not null default '[]'::jsonb
    check (jsonb_typeof(split_inputs) = 'array'),
  holdings_breakdown jsonb not null default '[]'::jsonb
    check (jsonb_typeof(holdings_breakdown) = 'array'),

  quantity_bought bigint not null check (quantity_bought > 0),

  purchase_amount numeric(24, 8) not null
    check (
      purchase_amount > 0
      and purchase_amount < 'Infinity'::numeric
    ),
  cash_remaining numeric(24, 8) not null
    check (
      cash_remaining >= 0
      and cash_remaining < 'Infinity'::numeric
    ),
  initial_value numeric(24, 8) not null
    check (
      initial_value > 0
      and initial_value < 'Infinity'::numeric
    ),
  hypothetical_value numeric(24, 8) not null
    check (
      hypothetical_value >= 0
      and hypothetical_value < 'Infinity'::numeric
    ),
  hold_value numeric(24, 8) not null
    check (
      hold_value >= 0
      and hold_value < 'Infinity'::numeric
    ),

  -- 合計値と差分の不整合を避けるため、DBが算出します。
  gain numeric generated always as (
    hypothetical_value - initial_value
  ) stored,

  gain_pct numeric generated always as (
    (hypothetical_value - initial_value) / initial_value * 100
  ) stored,

  difference numeric generated always as (
    hypothetical_value - hold_value
  ) stored,

  previous_evaluation_id uuid,
  idempotency_key uuid not null default gen_random_uuid(),

  unique (id, scenario_id, owner_id),
  unique (owner_id, idempotency_key),

  foreign key (scenario_id, owner_id)
    references public.investment_scenarios(id, owner_id)
    on delete cascade,

  foreign key (previous_evaluation_id, scenario_id, owner_id)
    references public.investment_evaluations(id, scenario_id, owner_id)
    on delete set null (previous_evaluation_id),

  check (
    previous_evaluation_id is null
    or previous_evaluation_id <> id
  )
);

-- 8. 복기 메모
create table public.investment_reflections (
  scenario_id uuid primary key,
  owner_id uuid not null default auth.uid()
    references auth.users(id) on delete cascade,

  interest_reason text not null default ''
    check (char_length(interest_reason) <= 1000),
  decision_reason text not null default ''
    check (char_length(decision_reason) <= 1000),
  hindsight_note text not null default ''
    check (char_length(hindsight_note) <= 1000),

  created_at timestamptz not null default now(),

  foreign key (scenario_id, owner_id)
    references public.investment_scenarios(id, owner_id)
    on delete cascade
);

-- =========================================================
-- 조회 성능을 위한 인덱스
-- =========================================================

create index investment_instruments_industry_idx
  on public.investment_instruments (industry);

create index investment_actions_instrument_date_idx
  on public.investment_corporate_actions
  (instrument_id, effective_date);

create index investment_snapshots_owner_date_idx
  on public.investment_asset_snapshots
  (owner_id, effective_date desc);

create index investment_scenarios_owner_created_idx
  on public.investment_scenarios
  (owner_id, created_at desc);

create index investment_scenarios_source_idx
  on public.investment_scenarios
  (source_snapshot_id, owner_id);

create index investment_scenarios_parent_idx
  on public.investment_scenarios
  (parent_scenario_id, owner_id);

create index investment_evaluations_owner_scenario_idx
  on public.investment_evaluations
  (owner_id, scenario_id, evaluated_at desc);

create index investment_evaluations_previous_idx
  on public.investment_evaluations
  (previous_evaluation_id, scenario_id, owner_id);

create index investment_reflections_owner_idx
  on public.investment_reflections (owner_id);

-- =========================================================
-- 권한 + RLS
-- 새로 만든 위 8개 테이블에만 적용합니다.
-- =========================================================

do $$
declare
  table_name text;
begin
  -- 공용 데이터: 비로그인·로그인 모두 읽기만 가능.
  foreach table_name in array array[
    'investment_instruments',
    'investment_daily_prices',
    'investment_corporate_actions',
    'investment_rankings'
  ]
  loop
    execute format(
      'alter table public.%I enable row level security',
      table_name
    );

    execute format(
      'revoke all privileges on table public.%I
       from public, anon, authenticated',
      table_name
    );

    execute format(
      'grant select on table public.%I to anon, authenticated',
      table_name
    );

    execute format(
      'grant all privileges on table public.%I to service_role',
      table_name
    );

    execute format(
      'create policy public_read
       on public.%I
       for select
       to anon, authenticated
       using (true)',
      table_name
    );
  end loop;

  -- 개인 데이터:
  -- 회원 로그인 + 본인 owner_id인 행만 CRUD 허용.
  -- Supabase 익명 로그인 계정은 제외합니다.
  foreach table_name in array array[
    'investment_asset_snapshots',
    'investment_scenarios',
    'investment_evaluations',
    'investment_reflections'
  ]
  loop
    execute format(
      'alter table public.%I enable row level security',
      table_name
    );

    execute format(
      'revoke all privileges on table public.%I
       from public, anon, authenticated',
      table_name
    );

    execute format(
      'grant select, insert, update, delete
       on table public.%I to authenticated',
      table_name
    );

    execute format(
      'grant all privileges on table public.%I to service_role',
      table_name
    );

    execute format(
      'create policy owner_only
       on public.%I
       for all
       to authenticated
       using (
         owner_id = (select auth.uid())
         and coalesce(
           (select auth.jwt() ->> ''is_anonymous''),
           ''false''
         ) = ''false''
       )
       with check (
         owner_id = (select auth.uid())
         and coalesce(
           (select auth.jwt() ->> ''is_anonymous''),
           ''false''
         ) = ''false''
       )',
      table_name
    );
  end loop;
end
$$;

commit;

-- =========================================================
-- 실행 후 확인 결과
-- 8행 / rls_enabled가 모두 true / 각 표 정책 1개
-- =========================================================

select
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  (
    select count(*)
    from pg_policies p
    where p.schemaname = 'public'
      and p.tablename = c.relname
  ) as policy_count
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and c.relname in (
    'investment_instruments',
    'investment_daily_prices',
    'investment_corporate_actions',
    'investment_rankings',
    'investment_asset_snapshots',
    'investment_scenarios',
    'investment_evaluations',
    'investment_reflections'
  )
order by c.relname;