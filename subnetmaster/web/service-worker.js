const CACHE_NAME = 'subnetmaster-v1';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './css/styles.css',
    './js/app.js',
    './js/utils/storage-utils.js',
    './js/utils/ui-utils.js',
    './js/utils/export-utils.js',
    '../core/ip-utils.js',
    '../core/ipv6-utils.js',
    '../core/rfc-data.js',
    // We cache the core modules so they work offline
    './js/modules/dashboard.js',
    './js/modules/core/subnet-calculator.js',
    './js/modules/core/ip-analysis.js',
    './js/modules/core/cidr-toolkit.js',
    './js/modules/core/binary-viz.js',
    './js/modules/ipv6/ipv6-toolkit.js',
    './js/modules/planning/subnet-splitting.js',
    './js/modules/planning/vlsm.js',
    './js/modules/planning/growth-planner.js',
    './js/modules/routing/supernetting.js',
    './js/modules/routing/route-summary.js',
    './js/modules/routing/overlap-detector.js',
    './js/modules/visualization/subnet-tree.js',
    './js/modules/learning/educational.js',
    './js/modules/learning/quiz.js',
    './js/modules/learning/practice-lab.js',
    './js/modules/data/history.js',
    './js/modules/data/favorites.js',
    './js/modules/data/export-center.js',
    'https://cdn.jsdelivr.net/npm/chart.js'
];

// Install Event
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('Opened cache');
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

// Activate Event - clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// Fetch Event - cache first, network fallback
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            if (response) {
                return response;
            }
            return fetch(event.request).then(
                (networkResponse) => {
                    // Check if we received a valid response
                    if(!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                        return networkResponse;
                    }

                    // Clone the response because it's a stream
                    var responseToCache = networkResponse.clone();

                    caches.open(CACHE_NAME)
                        .then((cache) => {
                            cache.put(event.request, responseToCache);
                        });

                    return networkResponse;
                }
            );
        })
    );
});
