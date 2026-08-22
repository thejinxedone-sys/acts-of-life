// Acts of Life - service worker
// Network-first: always fresh while the server is up, cached copy when it isn't.
const CACHE = 'acts-of-life-v2';
const CORE = [
    './',
    './index.html',
    './style.css',
    './script.js',
    './manifest.json',
    './icons/icon-192.png',
    './icons/icon-512.png'
];

self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys()
            .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (e) => {
    if (e.request.method !== 'GET') return;
    e.respondWith(
        fetch(e.request)
            .then(res => {
                const copy = res.clone();
                caches.open(CACHE).then(c => c.put(e.request, copy));
                return res;
            })
            .catch(() =>
                caches.match(e.request, { ignoreSearch: true }).then(hit => {
                    if (hit) return hit;
                    if (e.request.mode === 'navigate') return caches.match('./index.html');
                    return Response.error();
                })
            )
    );
});
