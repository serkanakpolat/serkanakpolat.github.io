// Service worker şablonu. Derlemede vite.config.js içindeki pwa() eklentisi
// sürüm ve önbellek listesi satırlarını doldurup dist/sw.js olarak yazar.
// Kart çevrimdışı da açılır; çevrimiçiyken sayfa her zaman ağdan tazelenir.
const VERSION = "061dcb64e3"
const CACHE = `bizcard-${VERSION}`
const FONT_CACHE = 'bizcard-fonts'
const PRECACHE = [
  "./",
  "./assets/bizcard-mark-Dt1wmFM4.svg",
  "./assets/serkan-akpolat-d0MdT0lf.png",
  "./assets/index-CgYkR53_.css",
  "./assets/index-08ilIhnQ.js",
  "./manifest.webmanifest",
  "./icons/icon.svg",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./icons/apple-touch-icon.png"
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE && k !== FONT_CACHE).map((k) => caches.delete(k)),
      ))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)

  // Sayfa: önce ağ, bağlantı yoksa kayıtlı kopya.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put('./', copy))
          return res
        })
        .catch(() => caches.match('./')),
    )
    return
  }

  // Figtree: kayıtlı kopyayı hemen ver, arkada tazele.
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      caches.open(FONT_CACHE).then(async (cache) => {
        const cached = await cache.match(request)
        const network = fetch(request)
          .then((res) => { if (res.ok || res.type === 'opaque') cache.put(request, res.clone()); return res })
          .catch(() => cached)
        return cached || network
      }),
    )
    return
  }

  // Aynı sitedeki dosyalar (adları içerikle değişir): önce önbellek.
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then((res) => {
        if (res.ok) {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put(request, copy))
        }
        return res
      })),
    )
  }
})
