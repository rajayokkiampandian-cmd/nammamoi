/* Namma MOI PWA service worker — v1
 * Conservative cache policy to avoid stale business logic/auth code.
 */
'use strict';

const CACHE_VERSION = 'nammamoi-pwa-v2';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const APP_PREFIX = '/web_frontend/';
const STATIC_ASSETS = [
  APP_PREFIX + 'manifest.webmanifest',
  APP_PREFIX + 'icon-192.png',
  APP_PREFIX + 'icon-512.png',
  APP_PREFIX + 'icon-maskable-512.png',
  APP_PREFIX + 'offline.html'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(key => key.startsWith('nammamoi-pwa-') && key !== STATIC_CACHE)
            .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Do not touch OAuth, Google APIs, Apps Script APIs, or any cross-origin request.
  if (url.origin !== self.location.origin) return;

  // Only control the app path.
  if (!url.pathname.startsWith(APP_PREFIX)) return;

  // Navigation and executable app files stay network-first to reduce stale releases.
  const isNavigation = request.mode === 'navigate';
  const isExecutable = /\.(?:js|html)$/i.test(url.pathname) || url.pathname === APP_PREFIX;

  if (isNavigation || isExecutable) {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(STATIC_CACHE).then(cache => cache.put(request, copy));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          return cached || caches.match(APP_PREFIX + 'offline.html');
        })
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(response => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(STATIC_CACHE).then(cache => cache.put(request, copy));
        }
        return response;
      });
    })
  );
});
