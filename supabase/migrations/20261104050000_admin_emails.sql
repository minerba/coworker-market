create table public.admin_emails (
  email text primary key check (email = lower(email))
);
alter table public.admin_emails enable row level security;
-- 정책 없음: 클라이언트는 접근 불가, 가입 트리거(security definer)만 조회
-- 관리자 메일은 운영 DB에 직접 추가합니다 (저장소에는 실제 이메일 주소를 두지 않음):
--   insert into public.admin_emails (email) values ('admin@example.com');

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
    left(coalesce(nullif(new.raw_user_meta_data ->> 'nickname', ''), split_part(new.email, '@', 1)), 20),
    exists (select 1 from public.admin_emails a where a.email = lower(new.email))
  );
  return new;
end;
$$;
