// Service Worker for Push Notifications
const CACHE_NAME = 'gyeonggi-climate-v1';

// 설치 이벤트
self.addEventListener('install', (event) => {
  console.log('Service Worker 설치됨');
  self.skipWaiting();
});

// 활성화 이벤트
self.addEventListener('activate', (event) => {
  console.log('Service Worker 활성화됨');
  event.waitUntil(clients.claim());
});

// 푸시 알림 수신
self.addEventListener('push', (event) => {
  console.log('푸시 알림 수신:', event);

  let data = {
    title: '경기 기후 체감 맵',
    body: '새로운 알림이 있습니다.',
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    tag: 'climate-alert',
    data: {}
  };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/icon-192.png',
    badge: data.badge || '/badge-72.png',
    tag: data.tag || 'climate-alert',
    vibrate: [200, 100, 200],
    data: data.data,
    actions: [
      { action: 'view', title: '확인하기' },
      { action: 'dismiss', title: '닫기' }
    ],
    requireInteraction: true
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// 알림 클릭 처리
self.addEventListener('notificationclick', (event) => {
  console.log('알림 클릭:', event.action);
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  // 앱 열기 또는 포커스
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // 이미 열린 창이 있으면 포커스
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus();
          }
        }
        // 없으면 새 창 열기
        if (clients.openWindow) {
          const url = event.notification.data?.url || '/';
          return clients.openWindow(url);
        }
      })
  );
});

// 백그라운드 동기화 (주기적 체크)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'check-climate-alerts') {
    event.waitUntil(checkClimateAlerts());
  }
});

async function checkClimateAlerts() {
  // 클라이언트에게 메시지 전송하여 체크 요청
  const clients = await self.clients.matchAll();
  clients.forEach(client => {
    client.postMessage({ type: 'CHECK_ALERTS' });
  });
}
