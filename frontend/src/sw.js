// Basic service worker for PWA capabilities

// Cache A.P.I response.
const API_CACHE_NAME = "api-tflow-v1";
const API_URLS_TO_CACHE = [
  // Add API endpoints to cache here
  // '/api/data',
];

// Cache assets for offline use
const ASSETS_CACHE_NAME = "assets-tflow-v1";
const ASSETS_TO_CACHE = [
  "/",
  "/index.html",
  // Add other assets to cache here (CSS, JS, images, etc.)
  // '/styles/main.css',
  // '/js/app.js',
  // '/images/logo.png'
];

// IndexedDB setup for background sync (outbox)
const DB_NAME = "taskflow-pro-db";
const OUTBOX_STORE_NAME = "outbox";

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(OUTBOX_STORE_NAME)) {
        db.createObjectStore(OUTBOX_STORE_NAME, {
          keyPath: "id",
          autoIncrement: true,
        });
      }
    };

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onerror = (event) => {
      reject(event.target.error);
    };
  });
}

async function addToOutbox(request) {
  const db = await openDb();
  const tx = db.transaction(OUTBOX_STORE_NAME, "readwrite");
  const store = tx.objectStore(OUTBOX_STORE_NAME);
  await store.add(request);
  return tx.complete;
}

async function getOutboxRequests() {
  const db = await openDb();
  const tx = db.transaction(OUTBOX_STORE_NAME, "readonly");
  const store = tx.objectStore(OUTBOX_STORE_NAME);
  return store.getAll();
}

async function deleteOutboxRequest(id) {
  const db = await openDb();
  const tx = db.transaction(OUTBOX_STORE_NAME, "readwrite");
  const store = tx.objectStore(OUTBOX_STORE_NAME);
  await store.delete(id);
  return tx.complete;
}

self.addEventListener("install", (event) => {
  console.log("Service Worker: Installing...");
  event.waitUntil(
    (async () => {
      // Cache API responses
      const apiCache = await caches.open(API_CACHE_NAME);
      await apiCache.addAll(API_URLS_TO_CACHE);

      // Cache assets
      const assetsCache = await caches.open(ASSETS_CACHE_NAME);
      await assetsCache.addAll(ASSETS_TO_CACHE);

      console.log("Service Worker: Caching complete.");
    })()
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  console.log("Service Worker: Activating...");
  event.waitUntil(
    (async () => {
      // Clear old caches
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== API_CACHE_NAME && cacheName !== ASSETS_CACHE_NAME) {
            console.log(`Service Worker: Deleting old cache: ${cacheName}`);
            return caches.delete(cacheName);
          }
          return Promise.resolve();
        })
      );
      console.log("Service Worker: Activation complete, old caches cleared.");
    })()
  );
  event.waitUntil(clients.claim());
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const isApiRequest = request.url.startsWith(self.location.origin + "/api/"); // Adjust this as per your API URL structure

  // Strategy for GET requests (Cache First, then Network)
  if (request.method === "GET") {
    // Handle API requests
    if (isApiRequest) {
      event.respondWith(
        caches.open(API_CACHE_NAME).then((cache) => {
          return cache
            .match(request)
            .then((response) => {
              // Return cached response if available
              if (response) {
                return response;
              }
              // Otherwise, fetch from network and cache
              return fetch(request).then((networkResponse) => {
                cache.put(request, networkResponse.clone()); // Cache the new response
                return networkResponse;
              });
            })
            .catch(() => {
              // If both cache and network fail, fall back to a default or error response
              return new Response("Network error or no cached data", {
                status: 404,
              });
            });
        })
      );
    } else {
      // Handle asset requests
      event.respondWith(
        caches
          .match(request)
          .then((response) => {
            return response || fetch(request);
          })
          .catch(() => {
            // Fallback for navigation requests (e.g., if offline and requested a page not in cache)
            return caches.match("/index.html"); // Serve a generic offline page or index
          })
      );
    }
  } else if (
    ["POST", "PUT", "DELETE"].includes(request.method) &&
    isApiRequest
  ) {
    // Strategy for POST, PUT, DELETE requests (Network Only with Background Sync)
    event.respondWith(
      fetch(request.clone())
        .then((response) => {
          if (!response.ok) {
            // If network request fails, store in outbox for background sync
            console.log(
              "Network request failed, adding to outbox:",
              response.status
            );
            if (self.registration.sync) {
              event.waitUntil(
                addToOutbox({
                  url: request.url,
                  method: request.method,
                  headers: Object.fromEntries(request.headers.entries()),
                  body:
                    request.method === "GET" || request.method === "HEAD"
                      ? undefined
                      : request.bodyUsed
                      ? null
                      : request.json(), // Check request.bodyUsed
                  timestamp: Date.now(),
                }).then(() => self.registration.sync.register("outbox-sync"))
              );
            } else {
              console.warn(
                "Background Sync is not supported. Request will not be retried offline."
              );
            }
          }
          return response;
        })
        .catch((error) => {
          console.error("Fetch failed, adding to outbox:", error);
          if (self.registration.sync) {
            event.waitUntil(
              addToOutbox({
                url: request.url,
                method: request.method,
                headers: Object.fromEntries(request.headers.entries()),
                body:
                  request.method === "GET" || request.method === "HEAD"
                    ? undefined
                    : request.bodyUsed
                    ? null
                    : request.json(), // Check request.bodyUsed
                timestamp: Date.now(),
              }).then(() => self.registration.sync.register("outbox-sync"))
            );
          } else {
            console.warn(
              "Background Sync is not supported. Request will not be retried offline."
            );
          }
          return new Response(
            JSON.stringify({ message: "Offline. Request added to outbox." }),
            { status: 503, headers: { "Content-Type": "application/json" } }
          );
        })
    );
  }
});

self.addEventListener("sync", (event) => {
  if (event.tag === "outbox-sync") {
    console.log("Service Worker: Performing outbox sync.");
    event.waitUntil(syncOutbox());
  }
});

async function syncOutbox() {
  const requests = await getOutboxRequests();
  for (const req of requests) {
    try {
      const response = await fetch(req.url, {
        method: req.method,
        headers: req.headers,
        body: req.body ? JSON.stringify(req.body) : undefined,
      });

      if (response.ok) {
        console.log("Successfully synced request:", req.url);
        await deleteOutboxRequest(req.id);
      } else {
        console.error(
          "Failed to sync request, server responded with:",
          response.status,
          req.url
        );
        // Optionally, re-add to outbox or handle specific error codes
      }
    } catch (error) {
      console.error(
        "Failed to send request during sync, network issue:",
        error,
        req.url
      );
      // Keep in outbox for next sync attempt
    }
  }
}

self.addEventListener("push", (event) => {
  console.log("Service Worker: Push received!", event.data.text());
  const data = event.data.json();
  const title = data.title || "TaskFlow Pro Notification";
  const options = {
    body: data.body || "You have a new notification.",
    icon: "/vite.svg", // Path to your notification icon
    badge: "/vite.svg",
    data: {
      url: data.url || "/", // URL to open when clicking the notification
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data.url));
});
