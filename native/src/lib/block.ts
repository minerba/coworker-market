import { supabase } from "./supabase";

export async function blockUser(userId: string) {
  const { error } = await supabase.from("user_blocks").insert({ blocked_id: userId });
  // 이미 차단한 경우(중복)도 성공으로 취급
  return !error || error.code === "23505";
}
