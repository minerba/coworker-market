-- 1) 닉네임 기본값: 메일 아이디 대신 무작위 이름 (회사 메일 아이디가 동료에게 노출되지 않도록)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, nickname, is_admin)
  values (
    new.id,
    '동료' || lpad((floor(random() * 10000))::int::text, 4, '0'),
    exists (select 1 from public.admin_emails a where a.email = lower(new.email))
  );
  return new;
end;
$$;

-- 기존 계정 중 닉네임이 메일 아이디와 같은 경우 무작위 이름으로 교체
update public.profiles p
   set nickname = '동료' || lpad((floor(random() * 10000))::int::text, 4, '0')
  from auth.users u
 where u.id = p.id
   and p.nickname = left(split_part(u.email, '@', 1), 20);

-- 2) 사진 주소는 우리 저장소 주소만 허용 (외부 주소로 열람자 IP를 추적하는 것을 방지)
create function public.item_image_urls_valid(urls text[])
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(bool_and(u like 'https://ivlgxwzlxoianqebvlbw.supabase.co/storage/v1/object/public/item-images/%'), true)
  from unnest(urls) as u
$$;
alter table public.items add constraint items_image_urls_valid check (public.item_image_urls_valid(image_urls));

-- 3) 약관·개인정보 처리방침 동의 이력
alter table public.profiles add column terms_version text, add column consented_at timestamptz;

create function public.accept_terms(p_version text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'not authenticated';
  end if;
  update public.profiles set terms_version = left(p_version, 40), consented_at = now() where id = (select auth.uid());
end;
$$;
revoke execute on function public.accept_terms(text) from public, anon;
grant execute on function public.accept_terms(text) to authenticated;

create function public.my_terms_version()
returns text
language sql
security definer
stable
set search_path = ''
as $$
  select terms_version from public.profiles where id = (select auth.uid())
$$;
revoke execute on function public.my_terms_version() from public, anon;
grant execute on function public.my_terms_version() to authenticated;

-- 4) 다른 사용자에게는 닉네임·근무지 등 최소 정보만 보이도록 조회 가능한 컬럼 제한
--    (관리자 여부, 동의 이력은 본인도 전용 함수로만 확인)
revoke select on public.profiles from authenticated, anon;
grant select (id, nickname, building, created_at) on public.profiles to authenticated;
