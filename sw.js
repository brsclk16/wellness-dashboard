// Her deploy'da bu versiyonu değiştir — otomatik güncelleme tetiklenir
const VERSION = '2026-06-27-v3';
const CACHE_NAME = 'wellness-' + VERSION;

// Install — yeni cache
self.addEventListener('install', function(e){
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      return cache.addAll([
        '/wellness-dashboard/',
        '/wellness-dashboard/index.html'
      ]);
    }).then(function(){
      // Hemen aktive et, eski SW'yi bekletme
      return self.skipWaiting();
    })
  );
});

// Activate — eski cache'leri sil, yeni versiyonu hemen devral
self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(
        keys.filter(function(k){ return k !== CACHE_NAME; })
            .map(function(k){ return caches.delete(k); })
      );
    }).then(function(){
      // Tüm açık sekmeleri/PWA'yı hemen güncelle
      return self.clients.claim();
    }).then(function(){
      // Tüm client'lara "güncelleme var, yenile" mesajı gönder
      return self.clients.matchAll({type:'window'}).then(function(clients){
        clients.forEach(function(client){
          client.postMessage({type:'SW_UPDATED',version:VERSION});
        });
      });
    })
  );
});

// Fetch — network first, cache fallback
self.addEventListener('fetch', function(e){
  if(e.request.method !== 'GET') return;

  var url = e.request.url;
  // API isteklerini asla cache'leme
  if(url.includes('api.anthropic') ||
     url.includes('api.github') ||
     url.includes('workers.dev') ||
     url.includes('chart.js') ||
     url.includes('cdnjs')) {
    return;
  }

  e.respondWith(
    // Önce network'ten almayı dene
    fetch(e.request).then(function(response){
      if(response && response.status === 200){
        var clone = response.clone();
        caches.open(CACHE_NAME).then(function(cache){
          cache.put(e.request, clone);
        });
      }
      return response;
    }).catch(function(){
      // Network yoksa cache'den dön
      return caches.match(e.request)
        .then(function(cached){
          return cached || caches.match('/wellness-dashboard/');
        });
    })
  );
});

// Sayfa "hemen aktive ol" derse bekletme
self.addEventListener('message', function(e){
  if(e.data && e.data.type === 'SKIP_WAITING'){
    self.skipWaiting();
  }
});
