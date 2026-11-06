"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { mutate } from "swr";
import type { Session } from "@supabase/supabase-js";
import { PUBLIC_PATHS } from "@/lib/legal";
import { supabase } from "@/lib/supabase";

const AuthContext = createContext<{ session: Session | null }>({ session: null });
export const useAuth = () => useContext(AuthContext);

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((event, s) => {
      // 로그아웃하면 이전 사용자의 캐시를 모두 비움
      if (event === "SIGNED_OUT") mutate(() => true, undefined, { revalidate: false });
      setSession(s);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const isLogin = pathname === "/login";
  const isPublic = PUBLIC_PATHS.includes(pathname);

  useEffect(() => {
    if (!ready) return;
    if (!session && !isPublic) router.replace("/login");
    if (session && isLogin) router.replace("/");
  }, [ready, session, isLogin, isPublic, router]);

  if (!ready || (!session && !isPublic)) {
    return (
      <div className="flex min-h-dvh items-center justify-center" aria-busy="true">
        <span className="text-2xl font-extrabold tracking-tight">
          우리<span className="text-brand">끼리</span>
        </span>
      </div>
    );
  }
  return <AuthContext.Provider value={{ session }}>{children}</AuthContext.Provider>;
}
