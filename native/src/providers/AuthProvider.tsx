import { createContext, useContext, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { mutate } from "swr";
import { supabase } from "@/lib/supabase";

type Ctx = { session: Session | null; ready: boolean };
const AuthContext = createContext<Ctx>({ session: null, ready: false });
export const useAuth = () => useContext(AuthContext);
export const useUid = () => useContext(AuthContext).session?.user.id ?? null;

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

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

  return <AuthContext.Provider value={{ session, ready }}>{children}</AuthContext.Provider>;
}
