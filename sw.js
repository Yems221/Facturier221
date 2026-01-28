/*!
 * Cafexpres Gestion Reçus - Service Worker
 * Copyright (c) 2025 Cafexpres
 * Tél: +221 76 235 55 37
 * Site: cafexpres.com
 * IMPORTANT: Ne pas supprimer cette notice
 */

const VERSION = 'v1.0.0';
const CACHE_NAME = `cafexpres-${VERSION}`;

// Fichiers à mettre en cache au premier chargement
const STATIC_CACHE = [
  './',
  './index.html',
  './libs.js',
  './assets.js',
  './manifest.json'
];

// Installation du Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] Installation en cours...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Mise en cache des fichiers statiques');
        return cache.addAll(STATIC_CACHE);
      })
      .then(() => {
        console.log('[SW] Installation terminée');
        return self.skipWaiting();
      })
      .catch(err => {
        console.error('[SW] Erreur installation:', err);
      })
  );
});

// Activation du Service Worker
self.addEventListener('activate', (event) => {
  console.log('[SW] Activation en cours...');
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(cacheName => cacheName !== CACHE_NAME)
            .map(cacheName => {
              console.log('[SW] Suppression ancien cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        console.log('[SW] Activation terminée');
        return self.clients.claim();
      })
  );
});

// Interception des requêtes - Stratégie Cache-First (Offline-First)
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Retourne depuis le cache si disponible
        if (response) {
          console.log('[SW] Chargé depuis cache:', event.request.url);
          return response;
        }

        // Sinon, essaie de charger depuis le réseau
        console.log('[SW] Chargé depuis réseau:', event.request.url);
        return fetch(event.request)
          .then(response => {
            // Vérifie si la réponse est valide
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone la réponse pour la mettre en cache
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch(() => {
            // En cas d'erreur réseau, retourne index.html depuis le cache
            // (pour que l'app fonctionne même offline)
            return caches.match('./index.html');
          });
      })
  );
});

// Gestion des messages du client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW] Force l\'activation de la nouvelle version');
    self.skipWaiting();
  }
});

// Notification de nouvelle version disponible
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CHECK_UPDATE') {
    event.ports[0].postMessage({
      version: VERSION,
      cached: STATIC_CACHE
    });
  }
});
