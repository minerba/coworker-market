-- 관리자 등록보다 먼저 가입한 계정에도 관리자 권한 부여
update public.profiles p
   set is_admin = true
  from auth.users u
 where u.id = p.id
   and p.is_admin = false
   and exists (select 1 from public.admin_emails a where a.email = lower(u.email));

-- 앞으로는 로그인/이메일 확인 시점에도 관리자 목록을 반영
create function public.sync_admin_flag()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.admin_emails a where a.email = lower(new.email)) then
    update public.profiles set is_admin = true where id = new.id and is_admin = false;
  end if;
  return new;
end;
$$;
revoke execute on function public.sync_admin_flag() from public, anon, authenticated;

create trigger on_auth_user_sync_admin
  after update of last_sign_in_at, email_confirmed_at on auth.users
  for each row execute function public.sync_admin_flag();
