const CACHE_NAME = 'wellness-v1';
const URLS = [
  '/wellness-dashboard/',
  '/wellness-dashboard/index.html'
];

// Install — cache app shell
self.addEventListener('install', function(e){
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      return cache.addAll(URLS);
    }).then(function(){
      return self.skipWaiting();
    })
  );
});

// Activate — temizlik
self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(
        keys.filter(function(k){ return k !== CACHE_NAME; })
            .map(function(k){ return caches.delete(k); })
      );
    }).then(function(){
      return self.clients.claim();
    })
  );
});

// Fetch — cache first, network fallback
self.addEventListener('fetch', function(e){
  // Sadece GET istekleri
  if(e.request.method !== 'GET') return;
  
  // API isteklerini cache'leme (Claude API, GitHub vb.)
  var url = e.request.url;
  if(url.includes('api.anthropic') || 
     url.includes('api.github') ||
     url.includes('workers.dev') ||
     url.includes('gists')) {
    return;
  }

  e.respondWith(
    caches.match(e.request).then(function(cached){
      if(cached) return cached;
      
      return fetch(e.request).then(function(response){
        // Başarılı yanıtları cache'le
        if(response && response.status === 200){
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache){
            cache.put(e.request, clone);
          });
        }
        return response;
      }).catch(function(){
        // Ağ yoksa ve cache'de varsa cache'den dön
        return caches.match('/wellness-dashboard/') || 
               caches.match('/wellness-dashboard/index.html');
      });
    })
  );
});
