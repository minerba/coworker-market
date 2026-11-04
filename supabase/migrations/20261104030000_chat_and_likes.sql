-- 채팅방: 상품 1개 x 구매자 1명 = 방 1개
create table public.conversations (
  id bigint generated always as identity primary key,
  item_id bigint not null references public.items (id) on delete cascade,
  buyer_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  seller_id uuid not null references public.profiles (id) on delete cascade, -- 트리거가 상품 판매자로 강제 설정
  last_message text not null default '',
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (item_id, buyer_id),
  check (buyer_id <> seller_id)
);
create index conversations_buyer_idx on public.conversations (buyer_id, last_message_at desc);
create index conversations_seller_idx on public.conversations (seller_id, last_message_at desc);

create table public.messages (
  id bigint generated always as identity primary key,
  conversation_id bigint not null references public.conversations (id) on delete cascade,
  sender_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index messages_conversation_idx on public.messages (conversation_id, created_at);

create table public.item_likes (
  item_id bigint not null references public.items (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (item_id, user_id)
);
create index item_likes_user_idx on public.item_likes (user_id);

alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.item_likes enable row level security;

-- 채팅방: 참여자만 조회, 구매자 본인 명의로만 생성
create policy "conversations_select_participants" on public.conversations
  for select to authenticated
  using ((select auth.uid()) in (buyer_id, seller_id));
create policy "conversations_insert_buyer" on public.conversations
  for insert to authenticated
  with check (buyer_id = (select auth.uid()));

-- 메시지: 참여자만 조회, 참여 중인 방에 본인 명의로만 전송 (수정/삭제 불가)
create policy "messages_select_participants" on public.messages
  for select to authenticated
  using (exists (
    select 1 from public.conversations c
    where c.id = conversation_id and (select auth.uid()) in (c.buyer_id, c.seller_id)
  ));
create policy "messages_insert_participants" on public.messages
  for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id and (select auth.uid()) in (c.buyer_id, c.seller_id)
    )
  );

-- 좋아요: 로그인 사용자는 개수 조회, 본인 것만 추가/삭제
create policy "likes_select_authenticated" on public.item_likes
  for select to authenticated using (true);
create policy "likes_insert_own" on public.item_likes
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "likes_delete_own" on public.item_likes
  for delete to authenticated using (user_id = (select auth.uid()));

-- 방 생성 시 판매자를 상품 기준으로 강제하고, 본인 글에는 채팅 불가
create function public.set_conversation_seller()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select i.seller_id into new.seller_id from public.items i where i.id = new.item_id;
  if new.seller_id is null then
    raise exception '존재하지 않는 상품입니다.' using errcode = 'foreign_key_violation';
  end if;
  if new.seller_id = new.buyer_id then
    raise exception '내 게시글에는 채팅할 수 없습니다.' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;
create trigger conversations_set_seller
  before insert on public.conversations
  for each row execute function public.set_conversation_seller();

-- 메시지 전송 시 채팅방의 마지막 메시지 갱신
create function public.touch_conversation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.conversations
     set last_message = left(new.body, 100), last_message_at = new.created_at
   where id = new.conversation_id;
  return new;
end;
$$;
create trigger messages_touch_conversation
  after insert on public.messages
  for each row execute function public.touch_conversation();

revoke execute on function public.set_conversation_seller() from public, anon, authenticated;
revoke execute on function public.touch_conversation() from public, anon, authenticated;

-- 실시간 메시지 수신
alter publication supabase_realtime add table public.messages;
