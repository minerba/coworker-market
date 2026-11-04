import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
);

// 가입 허용 도메인 (DB 트리거가 최종 검사하고, 여기서는 빠른 안내용)
export const COMPANY_DOMAIN = "samsung.com";
