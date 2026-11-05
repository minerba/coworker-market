import type { Category } from "./items";

export type Message = { id: number; conversation_id: number; sender_id: string; body: string; created_at: string };

export type Conversation = {
  id: number;
  item_id: number;
  buyer_id: string;
  seller_id: string;
  last_message: string;
  last_message_at: string;
  items: { id: number; title: string; price: number; status: string; category: Category; image_urls: string[] } | null;
  buyer: { nickname: string } | null;
  seller: { nickname: string } | null;
};

export const MESSAGE_COLUMNS = "id, conversation_id, sender_id, body, created_at";
export const CONVERSATION_COLUMNS =
  "id, item_id, buyer_id, seller_id, last_message, last_message_at, items(id, title, price, status, category, image_urls), buyer:profiles!conversations_buyer_id_fkey(nickname), seller:profiles!conversations_seller_id_fkey(nickname)";
