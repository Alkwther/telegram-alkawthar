/* تلكرام الكوثر — Service Worker v3.1 (لا يخزّن أي ملفات) */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

// الإشعارات: نستقبلها مباشرة (بدون مكتبة Firebase) حتى تظهر دائماً والبرنامج مغلق.
// لا نُظهر الإشعار فقط إذا كان نفس البرنامج (مطبعة أو مدرس) مفتوحاً أمام المستخدم الآن.
self.addEventListener('push', e => {
  let p = {};
  try { p = e.data ? e.data.json() : {}; } catch (err) {}
  const d = p.data || p.notification || p || {};
  e.waitUntil((async () => {
    const list = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const mine = list.filter(c => c.url.startsWith(self.registration.scope));
    if (mine.some(c => c.visibilityState === 'visible' && c.focused !== false)) return;
    return self.registration.showNotification(d.title || 'تلكرام الكوثر', {
      body: d.body || 'رسالة جديدة',
      tag: d.tag || undefined,
      renotify: !!d.tag,
      icon: 'icon-192.png',
      badge: 'icon-192.png',
      vibrate: [100, 50, 100],
      data: { url: d.url || self.registration.scope }
    });
  })());
});

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
  const m = e.request.method === 'POST' && (u.pathname.match(/share-target-(press|teacher)$/) ||
    (u.searchParams.has('share-target') && u.pathname.match(/telegram-alkawthar-(press|teacher)\.html$/)));
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
  e.respondWith(fetch(e.request.url, {cache: 'no-store', credentials: 'same-origin'}).catch(() => fetch(e.request)).catch(() => new Response(
    '<!DOCTYPE html><html dir="rtl" lang="ar"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><body style="font-family:Tahoma,sans-serif;text-align:center;padding:60px 20px;color:#444"><h2>لا يوجد اتصال بالإنترنت</h2><p>تأكد من الإنترنت ثم أعد فتح تلكرام الكوثر</p><button onclick="location.reload()" style="padding:12px 24px;font-size:16px;border:0;border-radius:9px;background:#3a8fd9;color:#fff">إعادة المحاولة</button></body></html>',
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } })));
});

// الضغط على الإشعار يفتح التطبيق
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || './';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) if (c.url.split('#')[0] === url && 'focus' in c) return c.focus();
    for (const c of list) if (c.url.startsWith(self.registration.scope) && 'focus' in c) return c.focus();
    return self.clients.openWindow(url);
  }));
});
