# [FAST-WORKSPACE-089] Default Gemini 3.1 Flash Lite and Trace VIP Progress Stages

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

- Task ID: FAST-WORKSPACE-089
- Phase: FAST
- Target Phase: Workspace VIP UX and AI defaults
- Domain: Workspace / AI Provider Defaults / AI Image Studio
- Task Type: Bugfix
- Priority: P1
- Size: M
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

- Owner wants Gemini 3.1 Flash Lite on Google AI Studio to be the default instead of `9router (openai-compatible)` and `cx/gpt-5.5`.
- Owner specifically called out Workspace VIP nodes as a major place where the old defaults still appear.
- AI Image Studio Reference Image Bank shows "No reference images" and the Add action is not usable enough.
- Background Progress currently shows large node-level steps after completion instead of traceable live VIP sub-stages.

## 3. Scope

- In scope:
  - Change shared default translation/metadata provider/model toward Google AI Studio env and `models/gemini-3.1-flash-lite`.
  - Update Workspace VIP template defaults, seed configs, UI fallbacks/placeholders, and focused tests.
  - Update AI Image Studio default model/route fallback to Gemini 3.1 Flash Lite.
  - Make Reference Image Bank Add use an explicit file input trigger.
  - Expand Workspace VIP progress into traceable sub-stages during execution.
- Out of scope:
  - Migrating stored user configs already saved in browser/db.
  - Rewriting VIP processing as a server-pushed job stream.
  - Changing provider credentials or API keys.

## 4. Input / Output

- Input: Existing provider/model defaults and Workspace VIP progress code.
- Output mong đợi: New runs default to Google AI Studio Gemini 3.1 Flash Lite and Background Progress exposes meaningful VIP sub-stage trace.

## 5. Acceptance Criteria

1. Audio Transcript and Workspace default translation/metadata model values use `models/gemini-3.1-flash-lite`.
2. Default AI provider selection prefers Google AI Studio env (`env-gemini`) before openai-compatible providers.
3. Workspace VIP node defaults/seeds/placeholders no longer default to `cx/gpt-5.5`.
4. AI Image Studio defaults to `models/gemini-3.1-flash-lite` and Reference Image Bank Add opens a file picker reliably.
5. Workspace Background Progress can show VIP sub-stages such as transcript, translation, voice, render, and storage as the flow advances.
6. Focused tests, version guard, build, and diff check pass or failures are documented.

## 6. Technical Plan

1. Add shared Gemini default constants and update provider/model default helpers.
2. Patch Workspace graph/canvas defaults and tests for VIP model/provider behavior.
3. Patch AI Image Studio model default and reference image upload trigger.
4. Patch Workspace VIP progress task steps to include meaningful sub-stages and update tests.
5. Update changelog, board, version, and evidence.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted:
  - AI provider defaults
  - multilingual audio defaults
  - Workspace graph/canvas
  - AI Image Studio panel/storyboard route
  - focused tests

## 8. Test Plan

1. Unit/Integration cần chạy: focused provider/default/workspace/AI Image Studio tests.
2. Failure cases cần thử: old `cx/gpt-5.5` defaults and solid Reference Image Add behavior regressions should fail source tests.
3. Kết quả mong đợi: focused tests pass, then `npm run guard:version`, `npm run build`, and `git diff --check` pass.

## 9. Observability

- Metrics: n/a.
- Logs: Background Progress task detail should expose sub-stage status.
- Error codes: unchanged.

## 10. Risks & Rollback

- Risks: Existing saved Workspace node configs may continue showing old explicit values until reset.
- Rollback strategy: revert this task's default/progress/reference-upload changes.

## 11. Deliverables

1. Google AI Studio Gemini 3.1 Flash Lite defaults.
2. Reliable AI Image Studio reference image add action.
3. More granular Workspace VIP Background Progress stages.
4. Updated tests/changelog/task evidence.

## 12. Changelog Note

- Tóm tắt dòng changelog dự kiến: Default Workspace/Audio AI flows to Gemini 3.1 Flash Lite and make VIP background progress trace sub-stages.

## 13. Task Type Checklist (Stamp [x])

### 13.1 Feature

- [x] Có user/system flow rõ ràng
- [x] Có acceptance criteria đo được
- [x] Có test cho happy path
- [ ] Có test cho failure path chính

### 13.2 Bugfix

- [x] Có mô tả cách tái hiện lỗi
- [x] Có root cause ngắn gọn
- [x] Có regression test
- [ ] Có xác nhận lỗi cũ không tái diễn

### 13.3 Research

- [ ] Có câu hỏi nghiên cứu rõ
- [ ] Có kết quả/khuyến nghị cụ thể
- [ ] Có quyết định next step

## 14. Execution Notes

- Assumptions: "Google AI Studio" means the repo's existing `env-gemini` provider path backed by `GEMINI_API_KEY`.
- Blockers: none.
- Verification evidence: focused tests, version guard, build, and diff check passed.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/lib/ai-providers/default-provider.test.ts`
  - `src/lib/workspace/workspace-graph.test.ts`
  - `src/features/workspace/workspace-canvas-panel.test.ts`
  - `src/features/ai-image/ai-image-studio-panel.test.ts`
  - `src/app/api/ai-image/storyboard/route.test.ts`
  - `src/lib/multilingual-audio/transcript-translation.test.ts`
  - `src/app/api/audio/video-vip-processing/route.test.ts`
- Test commands executed:
  - `npm run test -- --run src/lib/ai-providers/default-provider.test.ts src/lib/workspace/workspace-graph.test.ts src/features/workspace/workspace-canvas-panel.test.ts src/features/ai-image/ai-image-studio-panel.test.ts src/app/api/ai-image/storyboard/route.test.ts src/lib/multilingual-audio/transcript-translation.test.ts src/app/api/audio/transcript-translation/route.test.ts src/lib/multilingual-audio/video-metadata.test.ts src/app/api/audio/video-narrator/route.test.ts src/lib/multilingual-audio/video-narrator.test.ts src/app/api/audio/video-vip-processing/route.test.ts src/lib/multilingual-audio/video-vip-processing.test.ts src/features/audio/chinese-transcription-panel.test.ts src/features/video-narrator/video-narrator-panel.test.ts src/features/video-processing/video-tools-lab-panel.test.ts src/app/api/video-processing/edit/route.test.ts --reporter=dot`
  - `npm run guard:version`
  - `npm run build`
  - `git diff --check`
- Test results summary:
  - Focused Vitest suite passed (16 files / 192 tests).
  - Version guard passed.
  - Next build passed.
  - Diff check passed.
- Version guard command/result (if runtime changed): `npm run guard:version` passed.
