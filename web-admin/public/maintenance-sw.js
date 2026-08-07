// Service Worker "màn bảo trì": cache sẵn trang bao-tri.html ngay lần truy cập
// đầu tiên; về sau nếu server không phản hồi (đang deploy CI/CD, sự cố mạng)
// hoặc trả 502/503/504 từ ingress thì hiện trang "Hệ thống đang được nâng cấp"
// thay vì lỗi trắng của trình duyệt. Chỉ can thiệp điều hướng TRANG (navigate),
// không đụng vào request API/asset.
const CACHE = 'zc-maintenance-v1';
const MAINTENANCE_PAGE = 'bao-tri.html';

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll([MAINTENANCE_PAGE])));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  if (event.request.mode !== 'navigate') return; // chỉ lo việc mở trang

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Ingress trả 502/503/504 khi pod đang khởi động lại → coi như đang bảo trì
        if (response.status === 502 || response.status === 503 || response.status === 504) {
          return caches.match(MAINTENANCE_PAGE).then((page) => page || response);
        }
        return response;
      })
      .catch(() => caches.match(MAINTENANCE_PAGE)),
  );
});
