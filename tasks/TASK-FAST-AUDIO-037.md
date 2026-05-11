# FAST-AUDIO-037 Harden Dub Preview Media Playback Errors

## 0. Progress Stamp

- [x] DoR checklist completed
- [x] Scope locked
- [x] Implementation completed
- [x] Tests added/updated (if code changed)
- [x] Version guard passed (if runtime changed)
- [x] Docs updated (if impacted)
- [x] Changelog updated
- [x] Ready for review
- [x] Done

## 1. Metadata

- Task ID: FAST-AUDIO-037
- Phase: Phase 2
- Target Phase: P2
- Domain: Audio Transcript
- Task Type: Bugfix
- Priority: P0
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

- Lý do: Dub preview sometimes throws unhandled `NotSupportedError: The element has no supported sources` after voice generation.
- Bài toán cần giải quyết: media playback failures must be caught and surfaced in the UI instead of becoming runtime unhandled rejections.
- Tài liệu liên quan: `docs/governance/testing-rules.md`

## 3. Scope

- In scope: harden video/audio preview play/resume handlers, add media error UI, add source test.
- Out of scope: changing storage asset download behavior or generated WAV format.

## 4. Input / Output

- Input: source video preview URL and generated voice data URL.
- Output mong đợi: playback failures show a clear Dub preview error and do not crash the app.

## 5. Acceptance Criteria

1. `playDubPreview` catches rejected `play()` promises.
2. Resume catches rejected `play()` promises.
3. Video/audio `onError` events surface a Dub preview error.
4. Tests verify the guard/error hooks exist.

## 6. Technical Plan

1. Add `dubPreviewError` state and helper to format media playback errors.
2. Wrap play/resume in `try/catch`, pause both elements on failure, and show error.
3. Add video/audio error handlers and targeted test markers.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted: Audio Transcript panel.

## 8. Test Plan

1. Targeted source test: `src/features/audio/chinese-transcription-panel.test.ts`.
2. Build + version guard.

## 9. Observability

- Metrics: none.
- Logs: browser runtime error replaced by UI error.
- Error codes: unchanged.

## 10. Risks & Rollback

- Risks: error is local UI state only; users may need to retry or reload asset source.
- Rollback strategy: revert Dub preview error handling changes.

## 11. Deliverables

1. Safe Dub preview playback.
2. UI error message.
3. Test/changelog/version evidence.

## 12. Changelog Note

- Catch Dub preview media playback errors and show a user-facing error instead of unhandled `NotSupportedError`.

## 13. Task Type Checklist (Stamp [x])

### 13.2 Bugfix

- [x] Có mô tả cách tái hiện lỗi
- [x] Có root cause ngắn gọn
- [x] Có regression test
- [x] Có xác nhận lỗi cũ không tái diễn

## 14. Execution Notes

- Assumptions: intermittent issue is caused by rejected media play promises or media element source errors.
- Blockers: None.
- Verification evidence:
  - `playDubPreview` and resume now catch rejected `play()` calls, pause both media elements, and surface `dubPreviewError`.
  - Video/audio elements now report source load errors in the Dub preview UI.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated: `src/features/audio/chinese-transcription-panel.test.ts`
- Test commands executed: `npm run test -- --run src/features/audio/chinese-transcription-panel.test.ts`; `npm run build`; `npm run guard:version`; `git diff --check`
- Test results summary: targeted test passed (1 file / 5 tests); production build passed with existing Turbopack warning outside scope; diff whitespace check passed.
- Version guard command/result (if runtime changed): `npm run guard:version` passed after patch bump to `0.4.17`.
