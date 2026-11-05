/* Service worker do app dos desenvolvedores (RTM).
   Guarda o app no aparelho para abrir sem sinal.
   IMPORTANTE: o endereco souzaalveslucas455-art.github.io e dividido com o app
   do merch, e a area de cache e uma so para o endereco inteiro. Por isso este
   arquivo so cria e so apaga caches cujo nome comeca com "rtm-". */
const VERSAO = 'rtm-2.0.1';
const LOCAIS = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];
const DE_FORA = [
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js'
];

self.addEventListener('install', ev => {
  ev.waitUntil(caches.open(VERSAO).then(c => Promise.all(
    LOCAIS.map(u => c.add(u).catch(() => {}))
      .concat(DE_FORA.map(u => fetch(u, { mode: 'no-cors' }).then(r => c.put(u, r)).catch(() => {})))
  )).then(() => self.skipWaiting()));
});

self.addEventListener('activate', ev => {
  ev.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k.indexOf('rtm-') === 0 && k !== VERSAO).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', ev => {
  const req = ev.request;
  if (req.method !== 'GET') return;
  const u = new URL(req.url);
  // servidor (Supabase), mapas e o que nao for do app: direto na rede
  const doApp = u.origin === self.location.origin && u.pathname.indexOf(new URL('./', self.location).pathname) === 0;
  const daLista = DE_FORA.indexOf(req.url) >= 0;
  if (!doApp && !daLista) return;
  // a pagina: rede primeiro (para receber a versao nova), cache se estiver sem sinal
  if (req.mode === 'navigate' || /\/(index\.html)?$/.test(u.pathname)) {
    ev.respondWith(fetch(req).then(r => {
      if (r.ok) { const cp = r.clone(); caches.open(VERSAO).then(c => c.put('./index.html', cp)); }
      return r;
    }).catch(() => caches.match('./index.html', { ignoreSearch: true })));
    return;
  }
  // icones, manifesto e o Leaflet: cache primeiro
  ev.respondWith(caches.match(req, { ignoreSearch: true }).then(r => r || fetch(req)));
});
