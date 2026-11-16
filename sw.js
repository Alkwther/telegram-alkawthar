/* تلكرام الكوثر — Service Worker (للإشعارات فقط، لا يخزّن أي ملفات) */
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

let cfg = null;
try { cfg = JSON.parse(new URL(self.location).searchParams.get('c') || 'null'); } catch (e) {}

if (cfg && cfg.apiKey && !String(cfg.apiKey).startsWith('PASTE')) {
  firebase.initializeApp(cfg);
  const messaging = firebase.messaging();
  // إشعار يصل والتطبيق مغلق أو في الخلفية
  messaging.onBackgroundMessage(p => {
    const d = p.data || {};
    return self.registration.showNotification(d.title || 'تلكرام الكوثر', {
      body: d.body || 'رسالة جديدة',
      tag: d.tag || undefined,
      icon: 'icon-192.png',
      badge: 'icon-192.png',
      vibrate: [100, 50, 100],
      data: { url: d.url || './' }
    });
  });
}

// الضغط على الإشعار يفتح التطبيق
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || './';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) if (c.url.split('#')[0] === url && 'focus' in c) return c.focus();
    for (const c of list) if ('focus' in c) return c.focus();
    return self.clients.openWindow(url);
  }));
});
