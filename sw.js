/* تلكرام الكوثر — Service Worker (للإشعارات فقط، لا يخزّن أي ملفات) */
// إذا تعذّر تحميل مكتبة الإشعارات يبقى باقي البرنامج يعمل (التنزيل، المشاركة)
try {
  importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
  importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');
} catch (e) {}

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

let cfg = null;
try { cfg = JSON.parse(new URL(self.location).searchParams.get('c') || 'null'); } catch (e) {}

if (self.firebase && firebase.messaging && cfg && cfg.apiKey && !String(cfg.apiKey).startsWith('PASTE')) {
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

// استقبال الملفات من قائمة «مشاركة» في الهاتف (أندرويد)
function shareDB(){
  return new Promise((res, rej) => {
    const r = indexedDB.open('ktg_share', 1);
    r.onupgradeneeded = () => { r.result.createObjectStore('press', {autoIncrement: true}); r.result.createObjectStore('teacher', {autoIncrement: true}); };
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
}
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  const m = e.request.method === 'POST' && u.pathname.match(/share-target-(press|teacher)$/);
  if (!m) return;
  const role = m[1];
  e.respondWith((async () => {
    try {
      const fd = await e.request.formData();
      const files = fd.getAll('files').filter(f => f && typeof f === 'object' && f.size > 0);
      const item = {files, title: fd.get('title') || '', text: fd.get('text') || '', url: fd.get('url') || '', ts: Date.now()};
      const db = await shareDB();
      await new Promise((res, rej) => { const tx = db.transaction(role, 'readwrite'); tx.objectStore(role).add(item); tx.oncomplete = res; tx.onerror = () => rej(tx.error); });
      db.close();
    } catch (err) {}
    return Response.redirect('./telegram-alkawthar-' + role + '.html?share=1', 303);
  })());
});

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
