/* Sub-Hub (اشتراكاتي) — offline cache. Bump CACHE when any file changes. */
var CACHE = "subhub-v2";
var ASSETS = ["./", "./index.html", "./manifest.webmanifest", "./subhub-180.png", "./subhub-192.png", "./subhub-512.png", "./subhub-maskable-512.png"];

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

  // The app page: try the network first so updates show right away;
  // if there's no answer within 2.5 s or no internet, open the saved copy.
  if (req.mode === "navigate") {
    e.respondWith(new Promise(function (resolve) {
      var done = false;
      function finish(res) { if (!done && res) { done = true; resolve(res); } }
      var timer = setTimeout(function () { caches.match("./index.html").then(finish); }, 2500);
      fetch(req).then(function (res) {
        if (res && res.ok) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put("./index.html", copy); }); }
        clearTimeout(timer); finish(res);
      }).catch(function () {
        clearTimeout(timer);
        caches.match("./index.html").then(function (c) { finish(c || Response.error()); });
      });
    }));
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
