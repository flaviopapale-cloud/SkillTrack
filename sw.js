const CACHE='skilltrack-v1-6-2026-11-03';
const ASSETS=['./','./index.html','./progress-v13.js','./progress-v14.js','./progress-v15.js','./progress-v16.js','./manifest.webmanifest','./icon.svg','./icon-192.png','./icon-512.png'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));self.skipWaiting()});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));self.clients.claim()});
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET')return;
 if(event.request.mode==='navigate'){
  event.respondWith(fetch(event.request).then(response=>{if(response.ok){const copy=response.clone();caches.open(CACHE).then(c=>c.put(event.request,copy)).catch(()=>{})}return response}).catch(()=>caches.match(event.request).then(found=>found||caches.match('./index.html'))));return;
 }
 event.respondWith(caches.match(event.request).then(c=>c||fetch(event.request)));
});
