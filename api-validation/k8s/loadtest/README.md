# Đo tải trên cụm K8s (namespace `cbyts-loadtest`)

Thư mục này dựng một **bản sao dùng riêng để đo tải** trên chính cụm VNPT Cloud đang chạy ZeroCheck AI, đo xong thì xóa cả namespace. Mục đích: có số p95/p99 đo **trên cụm** chứ không chỉ trên máy dev, mà không bắn tải vào namespace `cbyts` đang phục vụ thật.

| File | Nội dung |
|---|---|
| `cbyts-loadtest.yaml` | Namespace + PostgreSQL + API (cùng image, cùng `resources.limits` như production) |
| `k6-job.yaml` | Job chạy k6 ngay trong cụm, bắn vào `http://api-validation:8080` |

## Cách chạy lại

```bash
export KUBECONFIG=<kubeconfig của cụm>
kubectl create ns cbyts-loadtest
kubectl -n cbyts get secret ecr-pull -o json \
  | python -c "import json,sys; s=json.load(sys.stdin); s['metadata']={'name':'ecr-pull','namespace':'cbyts-loadtest'}; json.dump(s,sys.stdout)" \
  | kubectl apply -f -
kubectl apply -f k8s/loadtest/cbyts-loadtest.yaml
kubectl -n cbyts-loadtest create configmap k6-kich-ban --from-file=xml130-validate.k6.js=loadtest/xml130-validate.k6.js
kubectl -n cbyts-loadtest create configmap k6-bo-du-lieu --from-file=nho.xml=... --from-file=vua.xml=... --from-file=lon.xml=...
kubectl apply -f k8s/loadtest/k6-job.yaml
kubectl -n cbyts-loadtest logs job/k6-xml130 | sed -n '/BAT DAU KET XUAT THO/,$p' | tail -n +2 > loadtest/ket-qua-cum.json
kubectl delete ns cbyts-loadtest      # dọn sạch
```

Bộ dữ liệu đưa lên cụm là bản **đã ẩn danh**: họ tên, địa chỉ, điện thoại, số thẻ, mã bệnh nhân được thay bằng ký tự giả **giữ nguyên độ dài** nên kích thước file và khối lượng phân tích không đổi. Hồ sơ bệnh nhân thật chỉ nằm trên máy dev.

## Kết quả đo được (31/07/2026)

Đường đo `POST /api/xml130/validate?useAi=false`, 3 hồ sơ XML 130 xoay vòng (7 / 57 / 108 KB), k6 chạy trong cụm nên **không có độ trễ Internet**.

| Lượt đo | Replica API | p95 | p99 | Trung vị | Thông lượng | Lỗi HTTP | Kết xuất thô |
|---|---|---|---|---|---|---|---|
| 1 VU / 45 s | 1 | **251 ms** | 345 ms | 194 ms | 5,00 hồ sơ/s | 0% | `loadtest/ket-qua-cum-1vu.json` |
| 20 VU / 60 s | 1 | 6,99 s | 9,38 s | 5,49 s | 3,63 hồ sơ/s | 0% | `loadtest/ket-qua-cum-20vu.json` |
| 20 VU / 60 s | **3** | 3,87 s | 5,19 s | **1,44 s** | **10,83 hồ sơ/s** | 0% | `loadtest/ket-qua-cum-20vu-3replica.json` |

Mọi lượt đều **0% lỗi HTTP** và **100% check nội dung phản hồi đạt** (450/450, 456/456, 1320/1320).

### Đọc số cho đúng

1. **Một pod trên cụm chậm hơn máy dev là chuyện bình thường và đúng như khai báo.** Manifest ghi `limits.cpu: "1"` — mỗi pod chỉ được dùng **một** CPU. Máy dev chạy k6 lúc trước có nhiều nhân nên phục vụ song song tốt hơn. So sánh đúng phải là: *một pod 1 CPU* (cụm) với *một máy nhiều nhân* (dev), không phải "cụm yếu hơn máy bàn".
2. **Kiến trúc scale ngang tuyến tính - đã chứng minh bằng số, không phải suy luận.** Giữ nguyên tải 20 VU, chỉ tăng từ 1 lên 3 replica: thông lượng đi từ 3,63 lên 10,83 hồ sơ/giây = **2,98 lần**, trung vị giảm từ 5,49 s xuống 1,44 s = **3,8 lần**. Đây là lý do `k8s/hpa.yaml` tồn tại: gặp tải thì thêm replica là hết nghẽn.
3. **Ngưỡng chống spam được nâng tạm trong namespace đo tải** (initContainer ghi `Storage/ratelimit-settings.json`). Để mặc định 100 req/phút/IP thì phép đo chỉ đo được bộ chống spam. Production giữ nguyên 100 req/phút/IP.
4. **Không đụng gì tới production.** Toàn bộ phép đo chạy trong namespace `cbyts-loadtest` riêng, có PostgreSQL riêng, xóa sạch sau khi đo. Namespace `cbyts` không nhận một request nào của phép đo này.
