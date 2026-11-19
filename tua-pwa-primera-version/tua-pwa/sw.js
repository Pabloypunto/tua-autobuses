const CACHE_NAME = "tua-pwa-v3";
const APP_SHELL = ["./","./index.html","./styles.css","./app.js","./manifest.webmanifest","./data/stops.json","./icons/icon-192.png","./icons/icon-512.png"];
self.addEventListener("install", event => event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(APP_SHELL))));
self.addEventListener("activate", event => event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k))))));
self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);
  if(url.origin === location.origin && !url.pathname.includes("/rest/")){
    event.respondWith(caches.match(event.request).then(cached=>cached || fetch(event.request)));
  }
});
