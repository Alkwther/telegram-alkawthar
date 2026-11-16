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

// فتح الصفحات من الإنترنت دائماً (لتحديث البرنامج تلقائياً)، مع رسالة عند انقطاع الإنترنت
self.addEventListener('fetch', e => {
  if (e.request.mode !== 'navigate') return;
  e.respondWith(fetch(e.request).catch(() => new Response(
    '<!DOCTYPE html><html dir="rtl" lang="ar"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><body style="font-family:Tahoma,sans-serif;text-align:center;padding:60px 20px;color:#444"><h2>لا يوجد اتصال بالإنترنت</h2><p>تأكد من الإنترنت ثم أعد فتح تلكرام الكوثر</p><button onclick="location.reload()" style="padding:12px 24px;font-size:16px;border:0;border-radius:9px;background:#3a8fd9;color:#fff">إعادة المحاولة</button></body></html>',
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } })));
});

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
