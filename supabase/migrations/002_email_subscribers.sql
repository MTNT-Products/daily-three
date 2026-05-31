-- Daily Three: weekday digest email subscribers (via RPC only — no direct table access from browser)

create table if not exists public.email_subscribers (
  email text primary key,
  locale text not null check (locale in ('ja', 'en')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unsubscribed_at timestamptz
);

create index if not exists email_subscribers_active_idx
  on public.email_subscribers (locale)
  where unsubscribed_at is null;

alter table public.email_subscribers enable row level security;

-- No policies: inserts/reads go through SECURITY DEFINER RPC or service role (digest CI).

create or replace function public.subscribe_to_digest(p_email text, p_locale text default 'ja')
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized text;
  loc text;
begin
  normalized := lower(trim(p_email));
  if normalized is null or length(normalized) < 5 or length(normalized) > 320 then
    return json_build_object('ok', false, 'error', 'invalid_email');
  end if;
  if normalized !~ '^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$' then
    return json_build_object('ok', false, 'error', 'invalid_email');
  end if;

  loc := case when p_locale = 'en' then 'en' else 'ja' end;

  insert into public.email_subscribers (email, locale, unsubscribed_at)
  values (normalized, loc, null)
  on conflict (email) do update
    set locale = excluded.locale,
        updated_at = now(),
        unsubscribed_at = null;

  return json_build_object('ok', true);
end;
$$;

revoke all on function public.subscribe_to_digest(text, text) from public;
grant execute on function public.subscribe_to_digest(text, text) to anon;
grant execute on function public.subscribe_to_digest(text, text) to authenticated;
