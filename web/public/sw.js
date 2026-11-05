/* 코워커마켓 서비스 워커
 * - 정적 파일(/_next/static, 아이콘)은 캐시 우선 → 재방문이 빠름
 * - 화면 이동(HTML)은 네트워크 우선, 오프라인이면 안내 화면
 * - Supabase 등 다른 도메인 요청과 API는 건드리지 않음 (로그인·데이터는 항상 최신)
 */
const VERSION = "v1";
const STATIC_CACHE = `cm-static-${VERSION}`;
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll([OFFLINE_URL, "/icons/icon-192.png"]))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("cm-static-") && k !== STATIC_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // 정적 빌드 파일: 이름에 해시가 있어 변하지 않으므로 캐시 우선
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      }),
    );
    return;
  }

  // 화면 이동: 항상 최신 화면, 오프라인이면 안내 화면
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(async () => (await caches.match(OFFLINE_URL)) || Response.error()),
    );
  }
});

// 푸시 수신 (앱이 닫혀 있어도 도착). iOS/크롬 규칙상 푸시마다 알림을 반드시 표시해야 하므로,
// 앱이 화면에 열려 있을 때는 소리 없이 잠깐 표시했다가 닫음 (앱 안의 알림 배너가 따로 보여줌)
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "코워커마켓", body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "코워커마켓";
  const tag = data.tag || data.link || "coworker-market";
  event.waitUntil(
    (async () => {
      const wins = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const appVisible = wins.some((w) => w.visibilityState === "visible");
      await self.registration.showNotification(title, {
        body: data.body || "",
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-192.png",
        tag,
        renotify: !appVisible,
        silent: appVisible,
        data: { link: data.link || "/" },
      });
      if (appVisible) {
        await new Promise((r) => setTimeout(r, 1200));
        const shown = await self.registration.getNotifications({ tag });
        shown.forEach((n) => n.close());
      }
    })(),
  );
});

// 알림을 누르면 해당 화면으로 이동
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const link = (event.notification.data && event.notification.data.link) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      for (const w of wins) {
        if ("focus" in w) {
          w.focus();
          if ("navigate" in w) return w.navigate(link);
          return;
        }
      }
      return self.clients.openWindow(link);
    }),
  );
});
