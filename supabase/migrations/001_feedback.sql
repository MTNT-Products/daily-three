-- Daily Three: per-visitor Good/Bad (anonymous auth user_id)
-- Run in Supabase SQL editor, then enable Anonymous sign-ins (Auth → Providers).

create table if not exists public.feedback (
  url text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  source_id text not null,
  verdict text not null check (verdict in ('good', 'bad')),
  updated_at timestamptz not null default now(),
  primary key (url, user_id)
);

create index if not exists feedback_source_id_idx on public.feedback (source_id);

alter table public.feedback enable row level security;

create policy "feedback_select_own"
  on public.feedback for select
  using (auth.uid() = user_id);

create policy "feedback_insert_own"
  on public.feedback for insert
  with check (auth.uid() = user_id);

create policy "feedback_update_own"
  on public.feedback for update
  using (auth.uid() = user_id);

create policy "feedback_delete_own"
  on public.feedback for delete
  using (auth.uid() = user_id);
