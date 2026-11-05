import { AppState, type AppStateStatus } from "react-native";
import { SWRConfig } from "swr";

// 화면을 옮겨도 이전 데이터를 즉시 보여주고 뒤에서 갱신. 앱이 다시 화면에 나타나면 최신으로 갱신
export default function SwrProvider({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        dedupingInterval: 5000,
        keepPreviousData: true,
        errorRetryCount: 2,
        isVisible: () => true,
        initFocus(callback) {
          let state = (AppState.currentState ?? "active") as AppStateStatus;
          const sub = AppState.addEventListener("change", (next) => {
            if (/inactive|background/.test(state) && next === "active") callback();
            state = next;
          });
          return () => sub.remove();
        },
      }}
    >
      {children}
    </SWRConfig>
  );
}
