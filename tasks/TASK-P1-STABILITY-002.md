# P1-STABILITY-002 Switch Next.js bundler scripts to Turbopack

## 0. Progress Stamp

- [x] DoR checklist completed
- [x] Scope locked
- [x] Implementation completed
- [x] Tests added/updated (if code changed)
- [x] Docs updated (if impacted)
- [x] Changelog updated
- [x] Ready for review
- [x] Done

## 1. Metadata

- Task ID: P1-STABILITY-002
- Phase: P1
- Target Phase: P1
- Domain: Stability
- Task Type: Refactor
- Priority: P2
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

- Lý do: Repo đang chạy Next.js scripts không bật rõ Turbopack, dễ khiến dev/build tiếp tục dùng webpack hoặc default khác theo version.
- Bài toán cần giải quyết: Chuyển scripts local dev/build sang Turbopack theo Next.js 15.5.
- Tài liệu liên quan: `docs/SYSTEM-SUMMARY.md`, `docs/governance/ai-agent-rules.md`, `docs/governance/testing-rules.md`, `docs/governance/task-standard.md`, `docs/governance/definition-of-ready-done.md`, Next.js Turbopack docs.

## 3. Scope

- In scope: Cập nhật `package.json` scripts để dùng Turbopack cho `dev` và `build`; verify bằng test/build.
- Out of scope: Nâng cấp Next.js, thay đổi app code, cấu hình webpack loader/plugin tùy biến.

## 4. Input / Output

- Input: Yêu cầu chuyển repo từ webpack sang Turbopack.
- Output mong đợi: `npm run dev` và `npm run build` gọi Next.js với Turbopack.

## 5. Acceptance Criteria

1. `package.json` script `dev` chạy `next dev` với Turbopack.
2. `package.json` script `build` chạy `next build` với Turbopack.
3. Test suite hiện có pass.
4. Build command chạy qua Turbopack và hoàn tất hoặc ghi rõ blocker nếu fail do môi trường.

## 6. Technical Plan

1. Kiểm tra Next.js version và scripts hiện tại.
2. Cập nhật `package.json` để thêm `--turbopack` cho `dev` và `build`.
3. Chạy `npm run test` và `npm run build`.
4. Cập nhật changelog và task board.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted: `package.json` scripts.

## 8. Test Plan

1. Unit/Integration cần chạy: `npm run test`.
2. Failure cases cần thử: `npm run build` để phát hiện incompatibility Turbopack build.
3. Kết quả mong đợi: Test pass; build pass hoặc có blocker rõ.

## 9. Observability

- Metrics: Không áp dụng.
- Logs: Next.js build output.
- Error codes: Không áp dụng.

## 10. Risks & Rollback

- Risks: Turbopack build trên Next.js 15.5 vẫn beta nên có thể phát hiện incompatibility build-time.
- Rollback strategy: Gỡ `--turbopack` khỏi `dev`/`build` scripts hoặc dùng `--webpack` khi cần fallback.

## 11. Deliverables

1. `package.json` scripts dùng Turbopack.
2. Task/changelog/board cập nhật.
3. Test evidence ghi nhận.

## 12. Changelog Note

- Tóm tắt dòng changelog dự kiến: Cập nhật Next.js dev/build scripts để chạy Turbopack.

## 13. Task Type Checklist (Stamp [x])

### 13.1 Feature

- [ ] Có user/system flow rõ ràng
- [x] Có acceptance criteria đo được
- [x] Có test cho happy path
- [x] Có test cho failure path chính

### 13.2 Bugfix

- [ ] Có mô tả cách tái hiện lỗi
- [ ] Có root cause ngắn gọn
- [ ] Có regression test
- [ ] Có xác nhận lỗi cũ không tái diễn

### 13.3 Research

- [ ] Có câu hỏi nghiên cứu rõ
- [ ] Có kết quả/khuyến nghị cụ thể
- [ ] Có quyết định next step
- [ ] Có tài liệu tham chiếu

## 14. Execution Notes

- Assumptions: Next.js 15.5.2 hỗ trợ `next dev --turbopack` và `next build --turbopack`; build support đang beta theo docs Next.js.
- Blockers: None.
- Verification evidence: `npm run test` pass; `npm run build` pass and reports `Next.js 15.5.2 (Turbopack)`.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated: None; config/script-only change, covered by existing tests and Turbopack build verification.
- Test commands executed: `npm run test`; `npm run build`.
- Test results summary: `npm run test` passed 93 tests / 22 files. `npm run build` completed successfully with Turbopack; existing warning remains for unused `Image` import in `src/features/workspace/display-preferences-panel.tsx`.
