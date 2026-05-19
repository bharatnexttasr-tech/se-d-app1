const CACHE = 'tasr-diesel-v1';
const APP_SHELL = ['.', './index.html'];

// Install — cache app shell
self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(APP_SHELL))
  );
});

// Activate — claim clients immediately
self.addEventListener('activate', e => {
  e.waitUntil(
    Promise.all([
      clients.claim(),
      // Remove old caches
      caches.keys().then(keys =>
        Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
      )
    ])
  );
});

// Fetch — network first for API calls, cache first for app shell
self.addEventListener('fetch', e => {
  const url = e.request.url;

  // Always network for Supabase, CDN fonts/scripts
  if (
    url.includes('supabase.co') ||
    url.includes('jsdelivr.net') ||
    url.includes('cloudflare.com') ||
    url.includes('googleapis.com') ||
    url.includes('gstatic.com')
  ) {
    e.respondWith(fetch(e.request).catch(() => new Response('', { status: 503 })));
    return;
  }

  // Cache first for app shell, fallback to network
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return response;
      }).catch(() => caches.match('./index.html'));
    })
  );
});
