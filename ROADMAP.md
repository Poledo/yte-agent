# ZeroCheck AI — Project Roadmap (2026 - 2027)

This document outlines the strategic engineering roadmap and upcoming milestones for **ZeroCheck AI (`yte-agent`)**. As an open-source initiative, community feedback and contributions are actively encouraged.

---

## 🎯 Current Milestone: Q4 2026

- [x] **Monorepo Stabilization:** Unified .NET 10 API, Angular 20 Admin, and MV3 Chrome Extension into an integrated repository.
- [x] **XML 130 Core Rule Engine:** Implementation of deterministic cross-field validation rules (BHYT card validity, ICD-10 age/gender consistency, overlapping doctor schedules).
- [x] **Point-of-Care HIS HUD:** Browser extension injection for instant pre-submission billing warnings.
- [ ] **Claude Model Integration for Regulatory RAG:**
  - Automated ingestion and chunking of Vietnamese Ministry of Health circulars and guidelines.
  - Integration with high-context reasoning models (Claude Opus / Sonnet) to perform zero-hallucination legal citation lookup.
- [ ] **Extended Medication Contraindication Rules:**
  - Expansion of polypharmacy interaction rules for chronic disease management (Hypertension, Diabetes Type 2).

---

## 🚀 Q1 2027: Community Benchmarks & Synthetic Testing

- [ ] **Synthetic XML 130 Test Generator:**
  - Provide an open-source benchmarking tool generating realistic, fully-anonymized XML 130 billing records to test hospital rule engines.
- [ ] **Edge-Case Validation Expansion:**
  - Inclusion of complex surgical procedure-to-supply mapping (*định mức vật tư y tế theo ca phẫu thuật*).
- [ ] **Developer Experience & Webhook APIs:**
  - Standardized OpenAPI (Scalar) endpoints and webhook dispatchers for automated batch claim pre-audits.

---

## 🌐 Q2 2027: Ecosystem & Multi-Tenant Scaling

- [ ] **Regional Health Data Interoperability:**
  - HL7 FHIR to XML 130 bridge adapters.
- [ ] **Distributed Cache & Streaming Optimization:**
  - In-memory catalog caching for high-traffic municipal hospital networks.
- [ ] **Automated Anomaly Detection:**
  - Statistical anomaly detection for out-of-distribution claim volumes across clinical departments.

---

## Contributing to the Roadmap

Have ideas or specific clinical rules you'd like to see prioritized? Please open an issue in our [Issue Tracker](https://github.com/Poledo/yte-agent/issues) or start a discussion.
