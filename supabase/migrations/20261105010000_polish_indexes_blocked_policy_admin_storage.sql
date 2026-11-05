-- 인덱스가 없던 외래 키
create index if not exists messages_sender_idx on public.messages (sender_id);
create index if not exists reports_item_idx on public.reports (item_id) where item_id is not null;
create index if not exists reports_reported_user_idx on public.reports (reported_user_id) where reported_user_id is not null;
create index if not exists reports_resolved_by_idx on public.reports (resolved_by) where resolved_by is not null;
create index if not exists user_blocks_blocked_idx on public.user_blocks (blocked_id);

-- 내가 차단한 판매자의 글은 DB에서도 조회되지 않음 (기존 조회 정책에 AND로 더해지는 제한 정책)
create policy "items_hide_blocked_sellers" on public.items
  as restrictive for select to authenticated
  using (not exists (
    select 1 from public.user_blocks b
    where b.blocker_id = (select auth.uid()) and b.blocked_id = items.seller_id
  ));

-- 관리자가 글을 삭제할 때 그 글의 사진도 지울 수 있도록
create policy "item_images_delete_admin" on storage.objects
  for delete to authenticated
  using (bucket_id = 'item-images' and public.is_admin());
