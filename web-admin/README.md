# ZeroCheck AI - Web Admin

> Sản phẩm dự thi của đội **Chiến binh Y tế số** - VNPT.
> Bản chạy thật: <https://cbyts.vnpt.vn>

Trang quản trị của hệ thống ZeroCheck AI, viết bằng **Angular 22** (standalone component, signals, zoneless) + Angular Material. Đây là nơi vận hành toàn bộ phần cấu hình mà extension và API dùng lúc chạy: kho tri thức, danh mục HIS, người dùng/vai trò/quyền, cấu hình AI, cấu hình robot, hạn mức chống spam.

## Ba kho mã nguồn

| Repo | Nội dung |
|---|---|
| [`hackathon-api-validation`](https://github.com/Poledo/hackathon-api-validation) | AI Validation API - rule engine, kiểm tra XML 130, RAG văn bản y tế, xác thực & phân quyền |
| [`hackathon-extension-his`](https://github.com/Poledo/hackathon-extension-his) | Chrome Extension - theo dõi form HIS, cảnh báo khi nhập liệu, chat kiểm tra hồ sơ, robot trợ lý |
| [`hackathon-web-admin`](https://github.com/Poledo/hackathon-web-admin) (repo này) | Web Admin - trang giới thiệu, dashboard, quản trị và cấu hình |

## Màn hình chính

| Nhóm | Màn hình | Việc |
|---|---|---|
| Giới thiệu | Trang chủ (`features/landing`) | Trang giới thiệu sản phẩm, lối vào đăng nhập |
| Theo dõi | Dashboard, Hoạt động, Nhật ký kiểm toán | Số lượt hỏi đáp AI / kiểm tra XML 130, xem lại từng lượt, vết thao tác quản trị |
| Tri thức | Kho tri thức, Văn bản pháp quy, Danh mục HIS | Nạp văn bản vào kho RAG, quản lý hiệu lực, nạp danh mục Excel do HIS xuất |
| Cấu hình | Cấu hình AI, Cấu hình robot, Cấu hình hệ thống | Chọn model online/offline, hình hài robot, hạn mức chống spam - áp dụng ngay, không restart |
| Quản trị | Người dùng, Vai trò & quyền, Hồ sơ cá nhân | RBAC chi tiết theo từng chức năng |

## Chạy trên máy dev

```bash
npm ci
npm start
```

Mặc định mở tại <http://localhost:4200>. Cần API chạy sẵn (xem README của repo api-validation). Địa chỉ API lấy từ `src/environments/environment.development.ts` - mặc định `https://localhost:44350` (IIS Express); chạy backend bằng `dotnet run` thì đổi thành `http://localhost:5075`. Bản production để rỗng vì web-admin và API dùng **chung một tên miền** qua Ingress.

## Build và test

```bash
npm run build
```

Kết quả nằm ở `dist/web-admin`.

```bash
npm test
```

Chạy vitest + jsdom một lượt rồi thoát. Test hiện phủ phần bảo vệ đường vào: lưu/xóa token (`core/token.store.spec.ts`) và hai guard chặn route (`core/auth.guard.spec.ts`).

## CI/CD

`.github/workflows/deploy.yml`: push lên `master` sẽ chạy job `test` (unit test + `npm audit --omit=dev --audit-level=high`), **test đỏ là dừng, không deploy**. Test xanh thì build image, đẩy lên VNPT ECR và cập nhật deployment trên cụm VNPT K8s (namespace `cbyts`).

`.github/workflows/security-scan.yml`: quét lộ bí mật bằng gitleaks trên mỗi push, mỗi pull request và một lượt định kỳ hằng tuần.

Secrets cần khai trong repo: `ECR_ID`, `ECR_USER`, `ECR_PASSWORD`, `KUBE_CONFIG`.

## Tài liệu

- [docs/AI-EVIDENCE.md](docs/AI-EVIDENCE.md) - AI nằm ở đâu trong sản phẩm, nhật ký prompt khi xây dựng.
- Kiến trúc tổng thể, cài đặt, hiệu năng & bảo mật, vận hành: thư mục `docs/` của repo [`hackathon-api-validation`](https://github.com/Poledo/hackathon-api-validation).
- Hướng dẫn sử dụng cho người dùng cuối (Word/PDF): `docs/huong-dan-su-dung-web-admin.docx` ở repo api-validation.

## Quy ước code

- Mọi chữ hiển thị cho người dùng bằng **tiếng Việt**; tên biến, class, hàm bằng tiếng Anh.
- Standalone component + signals, không dùng NgModule; zoneless change detection.
- Ưu tiên component có sẵn của Angular Material và các component dùng chung trong `src/app/shared/` trước khi thêm thư viện ngoài.
- Định dạng theo `.editorconfig` (2 space, nháy đơn).

Dự án khởi tạo bằng [Angular CLI](https://github.com/angular/angular-cli) 22.0.7.
