'use strict';

// Rete prima, cache come riserva: con la connessione arriva sempre l'ultima
// versione del portale; senza, funziona con i file salvati.
// (La versione precedente serviva la cache per prima: chi aveva installato
// l'app non riceveva più gli aggiornamenti di index.html.)
const CACHE_NAME = 'commissioning-pwa-v2';

// Tutto ciò che serve per generare un .df senza connessione. Le librerie sono
// sullo stesso sito: dal CDN arrivavano come risposte "opache", non
// salvabili, e offline il pulsante Genera .df non funzionava.
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './profili.js',
  './vendor/bootstrap.min.css',
  './vendor/bootstrap.bundle.min.js',
  './vendor/jszip.min.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => caches.match(request, { ignoreSearch: request.mode === 'navigate' })
        .then((cached) => cached || (request.mode === 'navigate' ? caches.match('./index.html') : undefined)))
  );
});
