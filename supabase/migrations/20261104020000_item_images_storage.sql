insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('item-images', 'item-images', true, 5242880, array['image/jpeg','image/png','image/webp']);

-- 본인 폴더(<user_id>/...)에만 업로드/삭제 가능. 조회는 공개 버킷 URL로 제공(목록 조회 정책 없음)
create policy "item_images_insert_own_folder" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'item-images' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "item_images_delete_own_folder" on storage.objects
  for delete to authenticated
  using (bucket_id = 'item-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
