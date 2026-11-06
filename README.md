# ZeroCheck AI (`yte-agent`)

> **Open-Source AI Compliance & Real-Time Validation Engine for Healthcare Information Systems (HIS)**  
> Ensuring Medical Insurance (BHYT) Compliance and Preventing Billing Rejections with Deterministic Rule Engines & RAG.  
> 🌐 **Live Demo:** <https://zerocheckai.vnptkhanhhoa.vn/> | 📜 **License:** [MIT](LICENSE)

---

## Overview

Medical insurance billing compliance is a major operational challenge for healthcare facilities. In Vietnam, claims submitted under the **XML 130 format (Decision 130/QD-BYT)** must strictly adhere to complex regulatory catalogs, clinical indications, and cross-field constraints. Inadvertent coding errors lead to severe claim rejections (*xuất toán BHYT*), financial penalties, and significant administrative strain on clinicians.

**ZeroCheck AI** is an open-source, AI-powered validation ecosystem designed to catch discrepancies at the point of care:
- **Instant Clinical & Administrative Validation:** Verifies patient demographics, BHYT card validity, ICD-10 diagnosis age/gender constraints, prescription dosages, and cross-department scheduling conflicts in milliseconds.
- **Regulatory Retrieval-Augmented Generation (RAG):** Grounds validation advice and appeals in indexed Ministry of Health legal circulars using PostgreSQL and `pgvector`.
- **Zero-Intrusion HUD:** Injects contextual warnings and assistive chat directly into existing web-based HIS interfaces via a lightweight browser extension.

---

## Monorepo Architecture

The repository is structured as a high-performance monorepo with three decoupled components:

```
yte-agent/
├── api-validation/      # Backend AI Validation Engine (.NET 10, EF Core, PostgreSQL + pgvector)
├── web-admin/           # Knowledge Base & Administration Dashboard (Angular 20, Material 3)
└── extension-his/       # Browser Extension HUD for Hospital Information Systems (TypeScript, Vite)
```

| Component | Directory | Stack | Description |
|---|---|---|---|
| **AI Validation Engine** | [`api-validation/`](api-validation) | .NET 10, C#, EF Core, PostgreSQL + pgvector | High-throughput rule engine, XML 130 parsing, legal RAG search, RBAC authentication. |
| **Management Dashboard** | [`web-admin/`](web-admin) | Angular 20, TypeScript, Angular Material 3 | Knowledge indexing, HIS catalog management, user roles/tenancy, audit logs. |
| **Point-of-Care Extension** | [`extension-his/`](extension-his) | TypeScript, Vite, Chrome Extension API (MV3) | In-situ alerts on medical entry screens, chat assistant, automated catalog synchronization. |

---

## Quick Start

### 1. Prerequisites
- [.NET 10 SDK](https://dotnet.microsoft.com/)
- [Node.js 20+ and npm](https://nodejs.org/)
- [PostgreSQL 16+](https://www.postgresql.org/) with `pgvector` extension enabled

### 2. Running Locally

#### AI Validation API
```bash
cd api-validation/AIValidation.Api

# Configure connection string (using dotnet user-secrets)
dotnet user-secrets set "ConnectionStrings:KnowledgeDatabase" "Host=localhost;Port=5432;Database=hackathon_ai;Username=postgres;Password=<your_password>"

# Apply database migrations
dotnet ef database update

# Run API server (Scalar API reference available at http://localhost:5075/scalar)
dotnet run
```

#### Web Admin Portal
```bash
cd web-admin
npm install
npm start
# Navigate to http://localhost:4200
```

#### Chrome Extension
```bash
cd extension-his/extension
npm ci
npm run build
# Open chrome://extensions, enable "Developer mode", and click "Load unpacked" targeting extension-his/extension/dist
```

---

## Continuous Integration & Deployment

Automated CI/CD pipelines are managed through [`.github/workflows/`](.github/workflows):
- `api-validation.yml`: Builds, runs unit tests, performs static code analysis, builds container image, and deploys.
- `web-admin.yml`: Executes test suites, audits dependencies, builds production artifacts.
- `extension-his.yml`: Type checking, linting, unit tests, and artifact packaging.
- `security-scan.yml`: Automated secret detection using `gitleaks`.

---

## Community & Contributing

We welcome contributions from healthcare professionals, software engineers, and health-informatics researchers. Please check out [CONTRIBUTING.md](CONTRIBUTING.md) for code conventions, testing instructions, and pull request procedures.

---

## Project Roadmap

Check out our [ROADMAP.md](ROADMAP.md) for upcoming milestones, including planned integrations with advanced Claude reasoning models for regulatory legal synthesis and synthetic XML 130 community benchmarks.

---

## Giới thiệu tiếng Việt

**ZeroCheck AI** là hệ sinh thái mã nguồn mở trợ lý AI cảnh báo xuất toán bảo hiểm y tế (BHYT) dành cho các phần mềm khám chữa bệnh (HIS). Hệ thống cung cấp công cụ tự động hóa kiểm tra tính hợp lệ của hồ sơ bệnh án điện tử chuẩn **XML 130**, đối soát chỉ định cận lâm sàng, tương tác thuốc và hỗ trợ tra cứu văn bản pháp quy y tế theo thời gian thực.

- **Bản thử nghiệm thực tế:** <https://zerocheckai.vnptkhanhhoa.vn/>
- **Tài liệu chi tiết API:** Xem tại [`api-validation/README.md`](api-validation/README.md)
- **Kiến trúc mở rộng:** Xem tại [`extension-his/ARCHITECTURE.md`](extension-his/ARCHITECTURE.md)
