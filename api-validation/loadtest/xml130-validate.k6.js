// Load test k6 cho POST /api/xml130/validate (rule engine thuần, useAi=false).
//
// Chạy (từ thư mục api-validation):
//   k6 run loadtest/xml130-validate.k6.js
//   k6 run -e BASE_URL=https://localhost:44350 -e DURATION=60s -e VUS=20 loadtest/xml130-validate.k6.js
//
// Chạy TRONG cụm K8s (namespace đo tải riêng, xem k8s/loadtest/):
//   kubectl -n cbyts-loadtest create configmap k6-bo-du-lieu --from-file=...
//   kubectl -n cbyts-loadtest apply -f k8s/loadtest/k6-job.yaml
//
// Ghi chú:
// - KHÔNG bắn vào namespace production "cbyts" của cbyts.vnpt.vn. Chỉ bắn vào
//   local/dev hoặc namespace cbyts-loadtest dựng riêng để đo rồi xóa.
// - Rate limiter phân vùng theo IP (đọc X-Forwarded-For): mỗi REQUEST tự nhận một
//   IP giả lập riêng để phép đo phản ánh năng lực rule engine, không phải ngưỡng
//   chống spam (ngưỡng đó đã kiểm thử riêng bằng tay: vượt 100 req/phút → 429).
//   Nếu chỉ đổi IP theo VU thì chạy 1 VU sẽ đụng trần 100 req/phút và số đo hỏng.
// - Bộ dữ liệu: hồ sơ XML 130 THẬT (đã dùng trong kịch bản demo), 3 cỡ:
//   nhỏ ~7 KB, vừa ~57 KB, lớn ~108 KB.

import http from 'k6/http';
import { check } from 'k6';
import { Trend } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'https://localhost:44350';
const DURATION = __ENV.DURATION || '60s';
const VUS = Number(__ENV.VUS || 20);

// Nạp 3 hồ sơ thật với 3 cỡ file khác nhau. Mặc định đọc từ bộ hồ sơ demo nằm
// NGOÀI repo (chứa dữ liệu bệnh nhân thật, KHÔNG commit) — đường dẫn tính từ
// thư mục chứa script này theo quy tắc open() của k6.
// Đặt XML_DIR để đổi nguồn: khi chạy trong cụm K8s, 3 file đã ẩn danh được
// mount vào /data với tên nho.xml / vua.xml / lon.xml.
const XML_DIR = __ENV.XML_DIR;
const FILES = XML_DIR
  ? [
      { name: 'nho_7KB', body: open(`${XML_DIR}/nho.xml`) },
      { name: 'vua_57KB', body: open(`${XML_DIR}/vua.xml`) },
      { name: 'lon_108KB', body: open(`${XML_DIR}/lon.xml`) },
    ]
  : [
      { name: 'nho_7KB', body: open('../../kich-ban-demo/TH1- Ho so dat/File_1785212228686_khongmahoa.xml') },
      { name: 'vua_57KB', body: open('../../kich-ban-demo/TH4- Dieu chinh gioi tinh hs suy luan logic den loi lien quan/File_1784612165024_khongmahoa.xml') },
      { name: 'lon_108KB', body: open('../../kich-ban-demo/TH6- Cac loi khac hs cac tinh/Xml130_27072026_1519_2600130042_HO NGOC CHI_0000071114.xml') },
    ];

// Trend riêng cho từng cỡ file để báo cáo p95/p99 theo cỡ.
const trends = Object.fromEntries(
  FILES.map((f) => [f.name, new Trend(`latency_${f.name}`, true)]),
);

export const options = {
  insecureSkipTLSVerify: true, // chứng chỉ dev localhost
  scenarios: {
    xml130: {
      executor: 'constant-vus',
      vus: VUS,
      duration: DURATION,
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
  },
};

export default function () {
  // Xoay vòng 3 cỡ file; mỗi request một IP giả lập để không dồn chung một phân vùng rate-limit.
  const file = FILES[__ITER % FILES.length];
  const ipIdx = (__VU * 100000 + __ITER) % 62500;
  const fakeIp = `10.66.${Math.floor(ipIdx / 250)}.${ipIdx % 250}`;
  const res = http.post(
    `${BASE_URL}/api/xml130/validate?useAi=false`,
    file.body,
    {
      headers: {
        'Content-Type': 'text/xml',
        'X-Forwarded-For': fakeIp,
      },
      tags: { file: file.name },
    },
  );

  trends[file.name].add(res.timings.duration);

  check(res, {
    'HTTP 200': (r) => r.status === 200,
    'co ket qua kiem tra': (r) => {
      try {
        const body = r.json();
        return Array.isArray(body.results) && body.hosoCount >= 1;
      } catch {
        return false;
      }
    },
  });
}
