import { Share } from "react-native";
import { mutate } from "swr";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { unregisterPush } from "./push";
import { supabase } from "./supabase";

// 내 데이터 내려받기 (개인정보 열람권): 내 계정으로 조회 가능한 본인 데이터를 공유 창으로 내보냄
export async function exportMyData(uid: string, email: string): Promise<boolean> {
  try {
    const [profile, items, rooms, likes, blocks, notifs, reports] = await Promise.all([
      supabase.from("profiles").select("id, nickname, building, created_at").eq("id", uid).maybeSingle(),
      supabase.from("items").select("*").eq("seller_id", uid),
      supabase.from("conversations").select("*"),
      supabase.from("item_likes").select("*").eq("user_id", uid),
      supabase.from("user_blocks").select("*").eq("blocker_id", uid),
      supabase.from("notifications").select("*").eq("user_id", uid),
      supabase.from("reports").select("*").eq("reporter_id", uid),
    ]);
    const roomIds = (rooms.data ?? []).map((r) => r.id as number);
    const messages = roomIds.length
      ? await supabase.from("messages").select("*").in("conversation_id", roomIds).order("id").limit(20000)
      : { data: [] };
    const out = {
      exportedAt: new Date().toISOString(),
      note: "우리끼리에서 내 계정으로 조회할 수 있는 내 데이터입니다.",
      account: { id: uid, email },
      profile: profile.data,
      items: items.data,
      conversations: rooms.data,
      messages: messages.data,
      likes: likes.data,
      blocks: blocks.data,
      notifications: notifs.data,
      reportsFiled: reports.data,
    };
    await Share.share({ title: "우리끼리 내 데이터", message: JSON.stringify(out, null, 2) });
    return true;
  } catch {
    return false;
  }
}

// 회원 탈퇴: 서버 함수가 사진 파일과 계정(글, 채팅, 관심 등 연쇄)을 삭제한다
export async function deleteMyAccount(): Promise<boolean> {
  await unregisterPush();
  const { error } = await supabase.functions.invoke("delete-account", { method: "POST" });
  if (error) return false;
  await supabase.auth.signOut({ scope: "local" }).catch(() => {});
  await mutate(() => true, undefined, { revalidate: false });
  await AsyncStorage.clear().catch(() => {});
  return true;
}
