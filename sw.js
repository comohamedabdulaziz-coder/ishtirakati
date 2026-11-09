/* اشتراكاتي — offline cache. Bump CACHE when any file changes. */
var CACHE = "ishtirakati-v1";
var ASSETS = ["./", "./index.html", "./manifest.webmanifest", "./icon-180.png", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) { return c.addAll(ASSETS); }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // The app page: open instantly from the cache, refresh the cache in the background when online.
  if (req.mode === "navigate") {
    e.respondWith(
      caches.open(CACHE).then(function (c) {
        return c.match("./index.html").then(function (cached) {
          var net = fetch(req).then(function (res) {
            if (res && res.ok) c.put("./index.html", res.clone());
            return res;
          }).catch(function () { return cached; });
          if (cached) { e.waitUntil(net.catch(function () {})); return cached; }
          return net;
        });
      })
    );
    return;
  }

  // Icons and other files: cache first.
  e.respondWith(
    caches.match(req).then(function (hit) {
      return hit || fetch(req).then(function (res) {
        if (res && res.ok) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); }); }
        return res;
      });
    })
  );
});
