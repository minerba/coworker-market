-- 허용 메일 도메인 (정확히 일치하는 도메인만 허용)
create table public.allowed_email_domains (
  domain text primary key check (domain = lower(domain)),
  created_at timestamptz not null default now()
);
alter table public.allowed_email_domains enable row level security;
-- 정책 없음: 클라이언트는 접근 불가, 아래 트리거(security definer)만 조회
insert into public.allowed_email_domains (domain) values ('samsung.com');

-- 프로필 (이메일은 auth.users에만 두고 동료에게 노출하지 않음)
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nickname text not null check (char_length(nickname) between 2 and 20),
  building text,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create policy "profiles_select_authenticated" on public.profiles
  for select to authenticated using (true);
create policy "profiles_update_own" on public.profiles
  for update to authenticated using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- 가입 시 도메인 검사: 허용 도메인이 아니면 가입 자체를 거부
create function public.enforce_allowed_email_domain()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.allowed_email_domains d
    where d.domain = lower(split_part(new.email, '@', 2))
  ) then
    raise exception '허용되지 않은 이메일 도메인입니다.' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger enforce_allowed_email_domain
  before insert on auth.users
  for each row execute function public.enforce_allowed_email_domain();

-- 가입 시 프로필 자동 생성 (닉네임 기본값: 메일 아이디)
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, nickname)
  values (new.id, left(coalesce(nullif(new.raw_user_meta_data ->> 'nickname', ''), split_part(new.email, '@', 1)), 20));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

revoke execute on function public.enforce_allowed_email_domain() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
