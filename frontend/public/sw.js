// Service Worker for PWA Offline Support & Push Notifications

const CACHE_NAME = "gyeonggi-climate-v1";
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icon.svg",
  "/icon-192.png",
  "/icon-512.png",
];

// 설치 이벤트 - 정적 자산 캐싱
self.addEventListener("install", (event) => {
  console.log("Service Worker 설치됨");
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("정적 자산 캐싱 중...");
      return cache.addAll(STATIC_ASSETS);
    }),
  );
  self.skipWaiting();
});

// 활성화 이벤트 - 이전 캐시 정리
self.addEventListener("activate", (event) => {
  console.log("Service Worker 활성화됨");
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name)),
      );
    }),
  );
  event.waitUntil(clients.claim());
});

// Fetch 이벤트 - 오프라인 지원
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // API 요청은 네트워크 우선
  if (
    url.pathname.startsWith("/api/") ||
    url.hostname !== self.location.hostname
  ) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // 성공한 API 응답 캐싱 (GET만)
          if (request.method === "GET" && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // 오프라인시 캐시된 응답 반환
          return caches.match(request);
        }),
    );
    return;
  }

  // 정적 자산은 캐시 우선 (Cache First)
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // 백그라운드에서 새로운 버전 가져오기
        fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, networkResponse);
            });
          }
        });
        return cachedResponse;
      }

      // 캐시에 없으면 네트워크에서 가져오고 캐싱
      return fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // 오프라인이고 캐시에 없으면 기본 페이지 반환
          if (request.mode === "navigate") {
            return caches.match("/index.html");
          }
          return new Response("오프라인 상태입니다", {
            status: 503,
            statusText: "Service Unavailable",
          });
        });
    }),
  );
});

// 푸시 알림 수신
self.addEventListener("push", (event) => {
  console.log("푸시 알림 수신:", event);

  let data = {
    title: "경기 기후 체감 맵",
    body: "새로운 알림이 있습니다.",
    icon: "/icon-192.png",
    badge: "/badge-72.png",
    tag: "climate-alert",
    data: {},
  };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch (_e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || "/icon-192.png",
    badge: data.badge || "/badge-72.png",
    tag: data.tag || "climate-alert",
    vibrate: [200, 100, 200],
    data: data.data,
    actions: [
      { action: "view", title: "확인하기" },
      { action: "dismiss", title: "닫기" },
    ],
    requireInteraction: true,
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// 알림 클릭 처리
self.addEventListener("notificationclick", (event) => {
  console.log("알림 클릭:", event.action);
  event.notification.close();

  if (event.action === "dismiss") {
    return;
  }

  // 앱 열기 또는 포커스
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // 이미 열린 창이 있으면 포커스
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            return client.focus();
          }
        }
        // 없으면 새 창 열기
        if (clients.openWindow) {
          const url = event.notification.data?.url || "/";
          return clients.openWindow(url);
        }
      }),
  );
});

// 백그라운드 동기화 (주기적 체크)
self.addEventListener("periodicsync", (event) => {
  if (event.tag === "check-climate-alerts") {
    event.waitUntil(checkClimateAlerts());
  }
});

async function checkClimateAlerts() {
  // 클라이언트에게 메시지 전송하여 체크 요청
  const allClients = await self.clients.matchAll();
  allClients.forEach((client) => {
    client.postMessage({ type: "CHECK_ALERTS" });
  });
}
