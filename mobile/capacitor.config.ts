import type { CapacitorConfig } from "@capacitor/cli";

// 앱은 배포된 웹앱(https://coworker-market.vercel.app)을 화면으로 사용합니다.
// 웹을 수정해 배포하면 앱에도 바로 반영되고, 푸시·뒤로가기·상태바 같은 기기 기능만 앱 쪽에서 담당합니다.
const config: CapacitorConfig = {
  // ⚠ 스토어에 올린 뒤에는 앱 ID를 바꿀 수 없습니다. 실제로 소유한 도메인 기준으로 정한 뒤 출시하세요.
  appId: "com.coworkermarket.app",
  appName: "코워커마켓",
  webDir: "www",
  server: {
    url: "https://coworker-market.vercel.app",
    cleartext: false,
    androidScheme: "https",
    allowNavigation: ["coworker-market.vercel.app", "*.supabase.co"],
  },
  android: { allowMixedContent: false },
  ios: { contentInset: "automatic" },
  plugins: {
    SplashScreen: { launchShowDuration: 0, backgroundColor: "#fffaf3" },
    StatusBar: { style: "LIGHT", backgroundColor: "#fffaf3" },
    PushNotifications: { presentationOptions: ["badge", "sound", "alert"] },
  },
};

export default config;
