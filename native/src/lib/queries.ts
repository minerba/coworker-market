import { supabase } from "./supabase";
import { ITEM_COLUMNS, type Item } from "./items";

export const PAGE_SIZE = 20;
export type Sort = "latest" | "price_asc" | "price_desc";
export type ItemFilter = { category?: string; freeOnly?: boolean; q?: string; sort?: Sort };

// 검색어에서 필터 문법을 깨뜨릴 수 있는 문자 제거
const cleanTerm = (s: string) => s.replace(/[%*,()"\\]/g, " ").replace(/\s+/g, " ").trim();

export async function fetchItemsPage(f: ItemFilter, page: number): Promise<Item[]> {
  let q = supabase.from("items").select(ITEM_COLUMNS);
  if (f.freeOnly) q = q.eq("price", 0);
  if (f.category) q = q.eq("category", f.category);
  const term = f.q ? cleanTerm(f.q) : "";
  if (term) q = q.or(`title.ilike.*${term}*,description.ilike.*${term}*`);
  if (f.sort === "price_asc") q = q.order("price", { ascending: true }).order("created_at", { ascending: false });
  else if (f.sort === "price_desc") q = q.order("price", { ascending: false }).order("created_at", { ascending: false });
  else q = q.order("created_at", { ascending: false });
  const from = page * PAGE_SIZE;
  const { data, error } = await q.range(from, from + PAGE_SIZE - 1);
  if (error) throw error;
  return (data as unknown as Item[]) ?? [];
}

export async function fetchItem(id: string): Promise<Item | null> {
  const { data, error } = await supabase.from("items").select(ITEM_COLUMNS).eq("id", id).maybeSingle();
  if (error) throw error;
  return (data as unknown as Item) ?? null;
}

export async function fetchMyItems(uid: string): Promise<Item[]> {
  const { data, error } = await supabase.from("items").select(ITEM_COLUMNS).eq("seller_id", uid).order("created_at", { ascending: false }).limit(100);
  if (error) throw error;
  return (data as unknown as Item[]) ?? [];
}

export async function fetchLikedItems(uid: string): Promise<Item[]> {
  const likes = await supabase.from("item_likes").select("item_id").eq("user_id", uid).order("created_at", { ascending: false }).limit(100);
  if (likes.error) throw likes.error;
  const ids = (likes.data ?? []).map((l) => l.item_id as number);
  if (ids.length === 0) return [];
  const items = await supabase.from("items").select(ITEM_COLUMNS).in("id", ids);
  if (items.error) throw items.error;
  const byId = new Map((items.data as unknown as Item[]).map((i) => [i.id, i]));
  return ids.map((id) => byId.get(id)).filter((i): i is Item => !!i);
}

export async function fetchBlockedIds(): Promise<string[]> {
  const { data, error } = await supabase.from("user_blocks").select("blocked_id");
  if (error) throw error;
  return (data ?? []).map((b) => b.blocked_id as string);
}
