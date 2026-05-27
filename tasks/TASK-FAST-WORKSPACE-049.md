# [FAST-WORKSPACE-049] Add Manual Translate Import Mode for VIP Node

## 0. Progress Stamp

- [x] DoR checklist completed
- [x] Scope locked
- [x] Implementation completed
- [x] Tests added/updated (if code changed)
- [x] Version guard passed (if runtime changed)
- [ ] Docs updated (if impacted)
- [x] Changelog updated
- [x] Ready for review
- [ ] Done

## 1. Metadata

- Task ID: FAST-WORKSPACE-049
- Phase: MVP runtime hardening
- Target Phase: Workspace VIP translation flexibility
- Domain: Workspace / Multilingual Audio
- Task Type: Feature
- Priority: P0
- Size: S
- Owner: Codex
- Reviewer: Owner
- Status: Review

## 2. Context

- VIP flow currently always calls AI translation API after transcript.
- Owner needs an alternate path to avoid API cost and reduce waiting time.
- Requested behavior: in Pre-run configuration, user chooses either existing AI translation flow or manual import translation flow.

## 3. Scope

- In scope:
  - Add Pre-run config selector for VIP translation mode (`ai` vs `import`).
  - Keep current default AI translation behavior unchanged.
  - For import mode, show transcript copy action and an input area for translated subtitles after transcript completes.
  - Parse/validate manual input into per-segment lines and enforce line count equals transcript segment count before continuing pipeline.
  - Use imported translated lines for downstream VIP stages (voice/subtitle/composite).
- Out of scope:
  - New file upload format parser (CSV/SRT/JSON import).
  - Auto-retry or AI-assisted correction for malformed manual translations.

## 4. Input / Output

- Input: transcript segments and user-selected translation mode.
- Output:
  - AI mode: unchanged API-based translation.
  - Import mode: user-pasted translations mapped one-by-one to transcript segments when counts match.

## 5. Acceptance Criteria

1. VIP Pre-run configuration includes translation mode choice with options AI API and Import Manual Translate.
2. Default mode remains AI API for backward compatibility.
3. In import mode, after transcript step user can copy source transcript text and paste translated lines into dedicated input.
4. System blocks progression when imported line count differs from transcript segment count and shows explicit mismatch error.
5. When counts match, VIP run continues using imported translated text for all remaining stages.
6. Regression tests cover mode selection and count-mismatch validation behavior.
7. `npm run guard:version` passes.

## 6. Technical Plan

1. Extend VIP run config schema/state to include translation mode.
2. Update Workspace VIP pre-run UI to expose mode selector.
3. Add import-mode UI state for transcript copy + multiline translation input.
4. Implement parser/validator and map imported lines to transcript segments.
5. Wire runtime branch to skip AI translation API when import mode is selected.
6. Update/add tests for panel/runtime behavior and run guard.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Module impacted:
  - `src/features/workspace/workspace-canvas-panel.tsx`
  - `src/lib/multilingual-audio/video-vip-processing.ts`
  - related tests

## 8. Test Plan

1. Unit/source tests:
  - `src/features/workspace/workspace-canvas-panel.test.ts`
  - `src/lib/multilingual-audio/video-vip-processing.test.ts`
2. Failure case:
  - Imported translation line count does not match transcript segment count -> clear error and no downstream processing.

## 9. Observability

- Reuse existing VIP progress detail; include translation mode and import validation status in stage detail where needed.

## 10. Risks & Rollback

- Risk: Manual line mapping can fail if users include empty or extra lines unexpectedly.
- Rollback: Keep translation mode forced to AI and remove import branch.

## 11. Deliverables

1. VIP pre-run translation mode selector.
2. Manual import translation path with validation.
3. Updated regression tests and changelog.

## 12. Changelog Note

- Add manual translation import mode for Workspace VIP node with segment-count validation.

## 13. Task Type Checklist (Stamp [x])

### 13.1 Feature

- [x] Có user/system flow rõ ràng
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

- Assumptions:
  - Manual import lines will be interpreted as one translated segment per non-empty line in entered order.
- Blockers:
  - None.
- Verification evidence:
  - VIP node now supports `translationMode=import` with transcript copy + manual subtitle input in Flow Setup/Inspector.
  - Server validates imported line count against transcript segments and returns structured prompt payload for retry.
  - Focused tests + build + version guard pass.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/lib/multilingual-audio/video-vip-processing.test.ts`
  - `src/app/api/audio/video-vip-processing/route.test.ts`
  - `src/features/workspace/workspace-canvas-panel.test.ts`
- Test commands executed:
  - `npm run test -- --run src/lib/multilingual-audio/video-vip-processing.test.ts src/app/api/audio/video-vip-processing/route.test.ts src/features/workspace/workspace-canvas-panel.test.ts`
  - `npm run build`
  - `npm run guard:version`
- Test results summary:
  - Focused tests pass (3 files / 38 tests).
  - `npm run build` pass.
- Version guard command/result (if runtime changed):
  - `npm run guard:version` pass.
