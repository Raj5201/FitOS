const CACHE='fitos-v1-4-steps-analysis';
const ASSETS=['./','./index.html','./styles.css','./app.js','./food-library.js','./exercise-library.js','./manifest.webmanifest','./icon-192.png','./icon-512.png'];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)))});
self.addEventListener('activate',e=>{e.waitUntil((async()=>{const ks=await caches.keys();await Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)));await self.clients.claim()})())});
self.addEventListener('fetch',e=>{e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(resp=>{const c=resp.clone();caches.open(CACHE).then(cache=>cache.put(e.request,c));return resp}).catch(()=>caches.match('./index.html'))))});
