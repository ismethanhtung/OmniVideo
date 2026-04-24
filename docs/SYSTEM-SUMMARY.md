# OmniVideo Master System Summary

Tài liệu này là bản tổng hợp chuẩn, đầy đủ và dùng làm "single entry" để nắm toàn bộ hệ thống OmniVideo ở phase setup.

## 1. Bản chất dự án

1. OmniVideo là hệ thống nội bộ cho 1 người vận hành cá nhân.
2. Định hướng chính: `MVP-first`, `extensibility-first`, `metadata-first`.
3. Stack chính: `Next.js + TypeScript + MongoDB`.
4. Hiện tại đang ở phase setup: ưu tiên tài liệu, quy tắc, governance, kiến trúc.

## 2. Mục tiêu sản phẩm

1. Thu thập nguồn nội dung đa dạng (URL, text, file, feed, channel).
2. Chạy pipeline video linh hoạt theo node graph.
3. Quản lý tập trung tài nguyên AI/social/storage.
4. Quan sát vận hành và lỗi tập trung qua observability + connection center.
5. Tạo nền tảng mở để tiến lên workspace kéo-thả dạng n8n-like.

## 3. Biên giới scope hiện tại

### In scope

1. Chuẩn hóa docs, rules, tasks, changelog.
2. Chuẩn hóa kiến trúc và data model.
3. Chuẩn hóa governance để AI agent làm việc đúng quy trình.

### Out of scope (phase setup)

1. Chạy production đầy đủ nghiệp vụ video.
2. Affiliate automation production.
3. Multi-user/multi-tenant.

## 4. Kiến trúc hệ thống (high-level)

### Layered architecture

1. Presentation Layer (Next.js dashboard/workspace/settings).
2. Orchestration Layer (job graph runner, queue, retry, status).
3. Capability Layer (adapters cho downloader/AI/storage/social).
4. Data Layer (MongoDB metadata + run history + connection checks).
5. Governance Layer (rules/docs/tasks/changelog).

### Runtime components định hướng

1. Web app (Next.js).
2. Orchestrator service.
3. Worker services.
4. MongoDB.
5. Binary storage providers.

## 5. Mô hình dữ liệu lõi (MongoDB)

Collections chính:

1. `sources`
2. `assets`
3. `pipeline_definitions`
4. `job_runs`
5. `step_runs`
6. `run_events`
7. `ai_provider_accounts`
8. `social_accounts`
9. `publish_records`
10. `connection_checks`

Nguyên tắc dữ liệu:

1. Mọi output video phải truy vết về source + pipeline + run.
2. Binary và metadata tách rời, metadata là nguồn sự thật nghiệp vụ.
3. Lỗi phải có error code chuẩn hóa.

## 6. Node-based workspace model

### Node categories

1. Input Nodes: URL/Text/File/RSS.
2. Processing Nodes: AI Agent/Visual/Audio/Edit.
3. Output Nodes: Storage/Social/Metadata export.

### Contract bắt buộc cho mỗi node

1. Input/output/config schemas.
2. Timeout + retry policy.
3. Idempotency strategy.
4. Observability hooks.

## 7. Domain capabilities đã định nghĩa

1. Source Management: quản lý nguồn có cấu trúc, tagging, traceability.
2. AI Provider Management: multi-account/quota/spend/fallback.
3. Social Account Management: connection/permission/publish mapping.
4. Storage Strategy: binary provider pluggable + metadata tracking.
5. Video Pipeline: pipeline module hóa theo stages.
6. Multilingual Audio: định hướng research-heavy (Việt + Anh ưu tiên).
7. Affiliate Automation: blueprint deferred, chưa triển khai phase setup.

## 8. Operations & reliability

1. Observability: metrics/logs/traces theo run/step/provider/system.
2. Connection Center: kiểm tra trạng thái DB/provider/storage/social.
3. Incident Playbook: quy trình detect/triage/mitigate/recover/postmortem.

## 9. Governance framework

### Core rules

1. Engineering Rules: boundary rõ, no hard-coded secrets, reliability + integrity.
2. Product Rules: single-user, MVP-first, scope control.
3. AI Agent Rules: hoạt động bắt buộc qua task chuẩn, có acceptance/test/changelog.
4. Task Standard: template task bắt buộc.
5. DoR/DoD: định nghĩa điều kiện bắt đầu và hoàn thành.
6. Changelog Policy: mọi thay đổi phải truy vết.
7. Testing Rules: code thay đổi phải có test tương ứng.

### Quy tắc bắt buộc khi agent hoạt động

1. Không Task ID: không bắt đầu.
2. Không Acceptance Criteria: không In Progress.
3. Không Test Plan: không Done cho task có code/domain.
4. Không cập nhật changelog: chưa hoàn thành.

## 10. Testing baseline (mới bổ sung)

1. Code mới/sửa đổi bắt buộc viết hoặc cập nhật test.
2. Test phải bao phủ happy path + failure path chính.
3. PR/task có code mà không có test phải được coi là chưa đạt Done.
4. Test strategy tách theo Unit/Integration/API/E2E và smoke checks.

## 11. Task system trong repo

1. `tasks/board.md`: trạng thái tổng.
2. `tasks/templates/task-template.md`: mẫu task chuẩn.
3. `tasks/TASK-*.md`: hồ sơ thực thi từng task.
4. `tasks/backlog-phase-setup.md`: backlog setup.

## 12. Changelog system

1. Nguồn chính thức: `changelog/changelog.md`.
2. Mỗi task done phải có entry tương ứng.
3. Entry phải đủ: Added/Changed/Fixed/Notes + Task IDs.

## 13. Document map (toàn bộ file docs hiện tại)

### Repository root docs

1. `README.md`
2. `AGENTS.md`

### Root docs

1. `docs/README.md`
2. `docs/SYSTEM-SUMMARY.md`
3. `docs/AGENTS.md`

### Product

1. `docs/product/product-charter.md`
2. `docs/product/roadmap.md`
3. `docs/product/scope-boundaries.md`

### Architecture

1. `docs/architecture/system-overview.md`
2. `docs/architecture/node-architecture.md`
3. `docs/architecture/data-model.md`
4. `docs/architecture/integration-boundaries.md`
5. `docs/architecture/nextjs-mongodb-conventions.md`
6. `docs/architecture/testing-strategy.md`

### Domains

1. `docs/domains/source-management.md`
2. `docs/domains/ai-provider-management.md`
3. `docs/domains/social-account-management.md`
4. `docs/domains/storage-strategy.md`
5. `docs/domains/video-pipeline.md`
6. `docs/domains/multilingual-audio.md`
7. `docs/domains/affiliate-automation.md`

### Operations

1. `docs/operations/observability.md`
2. `docs/operations/connection-management.md`
3. `docs/operations/incident-playbook.md`
4. `docs/operations/test-execution-playbook.md`

### Governance

1. `docs/governance/README.md`
2. `docs/governance/engineering-rules.md`
3. `docs/governance/product-rules.md`
4. `docs/governance/ai-agent-rules.md`
5. `docs/governance/task-standard.md`
6. `docs/governance/definition-of-ready-done.md`
7. `docs/governance/changelog-policy.md`
8. `docs/governance/testing-rules.md`

## 14. Ưu tiên thực thi kế tiếp

1. Hoàn tất `SETUP-TASK-001` (refine checklist task types).
2. Draft API contracts cho MVP URL intake.
3. Chuẩn hóa error taxonomy runtime dùng chung cho API/worker.
4. Bắt đầu phase 1 implement theo testing rules mới.
