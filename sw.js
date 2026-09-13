/**
 * Service worker: l'app resta consultabile anche senza rete — utile al campo
 * sportivo, dove il segnale non è sempre generoso.
 *
 * Strategia:
 *  - guscio (html/css/js): cache-first, aggiornato in sottofondo
 *  - dati (data/*.json, /api/rss): network-first con ricaduta sulla cache
 *  - font: stale-while-revalidate
 */

const VERSIONE = 'grezzago-v1';
const GUSCIO = `${VERSIONE}-guscio`;
const DATI = `${VERSIONE}-dati`;

const DA_PRECARICARE = [
  '.',
  'index.html',
  'css/app.css',
  'js/app.js',
  'js/dati.js',
  'js/classifica.js',
  'js/componenti.js',
  'js/formato.js',
  'js/icone.js',
  'js/ics.js',
  'js/rss.js',
  'js/vista-home.js',
  'js/vista-calcio.js',
  'js/vista-eventi.js',
  'js/vista-scopri.js',
  'data/stagione.json',
  'data/eventi.json',
  'data/luoghi.json',
  'manifest.webmanifest',
  'assets/icona.svg',
];

self.addEventListener('install', (evento) => {
  evento.waitUntil((async () => {
    const cache = await caches.open(GUSCIO);
    // addAll fallisce in blocco se manca un solo file: li aggiungo uno a uno.
    await Promise.all(DA_PRECARICARE.map((url) =>
      cache.add(new Request(url, { cache: 'reload' })).catch(() => null)
    ));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil((async () => {
    const nomi = await caches.keys();
    await Promise.all(
      nomi.filter((n) => !n.startsWith(VERSIONE)).map((n) => caches.delete(n))
    );
    await self.clients.claim();
  })());
});

async function reteConRicaduta(richiesta, nomeCache) {
  const cache = await caches.open(nomeCache);
  try {
    const risposta = await fetch(richiesta);
    if (risposta.ok) cache.put(richiesta, risposta.clone());
    return risposta;
  } catch (errore) {
    const salvata = await cache.match(richiesta);
    if (salvata) return salvata;
    throw errore;
  }
}

async function cacheConAggiornamento(richiesta, nomeCache) {
  const cache = await caches.open(nomeCache);
  const salvata = await cache.match(richiesta);

  const aggiornamento = fetch(richiesta)
    .then((risposta) => {
      if (risposta.ok) cache.put(richiesta, risposta.clone());
      return risposta;
    })
    .catch(() => null);

  return salvata || aggiornamento || fetch(richiesta);
}

self.addEventListener('fetch', (evento) => {
  const richiesta = evento.request;
  if (richiesta.method !== 'GET') return;

  const url = new URL(richiesta.url);

  // I dati devono essere freschi quando c'è rete.
  if (url.origin === location.origin
      && (url.pathname.includes('/data/') || url.pathname.startsWith('/api/'))) {
    evento.respondWith(reteConRicaduta(richiesta, DATI));
    return;
  }

  if (url.origin === location.origin) {
    evento.respondWith(cacheConAggiornamento(richiesta, GUSCIO));
    return;
  }

  if (url.hostname.endsWith('fonts.googleapis.com') || url.hostname.endsWith('fonts.gstatic.com')) {
    evento.respondWith(cacheConAggiornamento(richiesta, GUSCIO));
  }
});
