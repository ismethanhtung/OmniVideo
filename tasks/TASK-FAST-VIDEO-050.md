# [FAST-VIDEO-050] Align AI Image Studio UI and Lower Video Tools Blur Default

## 0. Progress Stamp

- [x] DoR checklist completed
- [x] Scope locked
- [x] Implementation completed
- [x] Tests added/updated (if code changed)
- [x] Version guard passed (if runtime changed)
- [x] Changelog updated
- [x] Ready for review
- [x] Done

## 1. Metadata

- Task ID: FAST-VIDEO-050
- Phase: FAST
- Target Phase: Video Pipeline UX polish
- Domain: Video Pipeline / AI Image Studio / Video Tools Lab
- Task Type: Bugfix
- Priority: P1
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

- Owner wants Video Tools Lab default `Blur strength` changed to `25`.
- Owner reports AI Image Studio does not visually match the stronger Audio Transcript page style, including control height and accent color treatment.
- Related docs: `docs/SYSTEM-SUMMARY.md`, `docs/governance/ai-agent-rules.md`, `docs/governance/testing-rules.md`.

## 3. Scope

- In scope:
  - Change Video Tools Lab new partial blur default strength from the current `35` to `25`.
  - Reintroduce/align AI Image Studio shell, header, metrics, section backgrounds, buttons, inputs, and textareas with the Audio Transcript visual pattern.
  - Update focused source-level tests and changelog.
- Out of scope:
  - Changing storyboard/render API behavior.
  - Reworking AI model/provider logic.
  - Full visual regression tooling.

## 4. Input / Output

- Input: Existing Video Tools Lab and AI Image Studio React panels.
- Output mong đợi: Updated UI defaults and CSS classes with unchanged core workflow behavior.

## 5. Acceptance Criteria

1. New Video Tools Lab blur regions default to strength `25`.
2. AI Image Studio renders an Audio Transcript-style bordered shell with header and status metrics.
3. AI Image Studio primary actions use the same light accent button treatment as Audio Transcript instead of solid accent fill.
4. AI Image Studio inputs/textareas use compact Audio Transcript-like heights and backgrounds.
5. Focused tests, version guard, build, and diff check pass or failures are documented.

## 6. Technical Plan

1. Update Video Tools Lab default state and related test assertion.
2. Align AI Image Studio header, section, button, input, textarea, and metric classes to Audio Transcript page patterns.
3. Update AI Image Studio panel tests to cover the style contract.
4. Update changelog, board, and version metadata.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted:
  - `src/features/video-processing/video-tools-lab-panel.tsx`
  - `src/features/ai-image/ai-image-studio-panel.tsx`
  - focused panel tests

## 8. Test Plan

1. Unit/Integration cần chạy: `npm run test -- --run src/features/video-processing/video-tools-lab-panel.test.ts src/features/ai-image/ai-image-studio-panel.test.ts`
2. Failure cases cần thử: test source assertions must fail if blur default regresses or AI Image Studio drops the Audio Transcript-style shell/actions.
3. Kết quả mong đợi: focused tests pass, then `npm run guard:version`, `npm run build`, and `git diff --check` pass.

## 9. Observability

- Metrics: n/a for UI-only polish.
- Logs: n/a.
- Error codes: n/a.

## 10. Risks & Rollback

- Risks: Source-level style tests are coarse and cannot fully replace browser screenshot visual QA.
- Rollback strategy: revert this task's panel/test/changelog/version changes.

## 11. Deliverables

1. Video Tools Lab blur default changed to `25`.
2. AI Image Studio CSS classes aligned with Audio Transcript page style.
3. Focused tests and changelog/task evidence updated.

## 12. Changelog Note

- Tóm tắt dòng changelog dự kiến: Lower Video Tools Lab blur default to `25` and align AI Image Studio UI with Audio Transcript styling.

## 13. Task Type Checklist (Stamp [x])

### 13.1 Feature

- [ ] Có user/system flow rõ ràng
- [ ] Có acceptance criteria đo được
- [ ] Có test cho happy path
- [ ] Có test cho failure path chính

### 13.2 Bugfix

- [x] Có mô tả cách tái hiện lỗi
- [x] Có root cause ngắn gọn
- [x] Có regression test
- [x] Có xác nhận lỗi cũ không tái diễn

### 13.3 Research

- [ ] Có câu hỏi nghiên cứu rõ
- [ ] Có kết quả/khuyến nghị cụ thể
- [ ] Có quyết định next step
- [ ] Có tài liệu tham chiếu

## 14. Execution Notes

- Assumptions: "default" applies to new Video Tools Lab region creation when no saved setup overrides the page state.
- Blockers: none.
- Verification evidence:
  - `npm run test -- --run src/features/video-processing/video-tools-lab-panel.test.ts src/features/ai-image/ai-image-studio-panel.test.ts` pass (2 files / 15 tests).
  - `npm run guard:version` pass.
  - `npm run build` pass.
  - `git diff --check` pass.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/features/video-processing/video-tools-lab-panel.test.ts`
  - `src/features/ai-image/ai-image-studio-panel.test.ts`
- Test commands executed:
  - `npm run test -- --run src/features/video-processing/video-tools-lab-panel.test.ts src/features/ai-image/ai-image-studio-panel.test.ts`
  - `npm run guard:version`
  - `npm run build`
  - `git diff --check`
- Test results summary: all commands pass.
- Version guard command/result (if runtime changed): `npm run guard:version` pass.
