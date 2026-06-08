# [FAST-AUDIO-068] Lower minimum voice speed floor to 1.25x

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

- Task ID: FAST-AUDIO-068
- Phase: FAST
- Target Phase: Audio timing polish
- Domain: Audio Transcript / Workspace Audio
- Task Type: Bugfix
- Priority: P1
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

- User requested lowering the minimum voice speed from `1.3x` to `1.25x`.
- Current Piper timeline minimum speed floor is `1.30x` (`timelineMinSpeedFactor`).
- Audio Transcript `Voice speed` display floor is also hard-coded to `1.30x`.
- Workspace audio nodes automatically inherit the runtime floor since they reuse the shared Piper alignment settings.
- We need to lower this floor to `1.25x` everywhere.

## 3. Scope

- In scope:
  - Lower shared Piper timeline minimum speed floor from `1.30x` to `1.25x` (`timelineMinSpeedFactor` in `types.ts`).
  - Lower the Audio Transcript displayed `Voice speed` formatter floor in `chinese-transcription-panel.tsx` to `1.25x`.
  - Update related unit tests to match `1.25x` expectations.
  - Bump app version and update changelog.
- Out of scope:
  - Changing other speed factor constants (max speed, high-speed warning threshold).
  - Modifying underlying Piper speech generation code unrelated to speed floors.

## 4. Acceptance Criteria

1. Shared Piper runtime uses `timelineMinSpeedFactor = 1.25`.
2. Audio Transcript `Voice speed` display formatting uses `1.25x` as the lowest value.
3. Unit tests pass after adjusting expectations for `1.25x` minimum speed.
4. Production build, version-guard check, and linting checks pass.

## 5. Technical Plan

1. Update `timelineMinSpeedFactor` to `1.25` in `src/lib/multilingual-audio/types.ts`.
2. Update `formatSpeedFactor` function in `src/features/audio/chinese-transcription-panel.tsx` to use `1.25` instead of `1.3`.
3. Update test assertions in `src/lib/multilingual-audio/piper-tts.test.ts` to expect `1.25` and `atempo=1.25`.
4. Bump version in `package.json` and `package-lock.json` (`0.10.111 -> 0.10.112`).
5. Update `changelog/changelog.md` and `tasks/board.md`.
6. Run tests and verify the version-guard checks.

## 6. Code Change Impact

- Có thay đổi code không: Yes
- Module impacted:
  - `src/lib/multilingual-audio/types.ts`
  - `src/features/audio/chinese-transcription-panel.tsx`
  - `src/lib/multilingual-audio/piper-tts.test.ts`
  - `package.json`
  - `package-lock.json`
  - `changelog/changelog.md`
  - `tasks/board.md`

## 7. Test Plan

1. Run focused unit tests: `npm run test -- --run src/lib/multilingual-audio/piper-tts.test.ts`
2. Run build check: `npm run build`
3. Run version-guard: `npm run guard:version`

## 8. Observability

- Logging and timeline alignment properties reflect the new `1.25x` speed floor.

## 9. Risks & Rollback

- Risks:
  - Lowering the floor to `1.25x` will allow slightly slower voice speed synthesis.
- Rollback:
  - Restore `timelineMinSpeedFactor` and display floor to `1.30`.

## 10. Deliverables

1. Core `timelineMinSpeedFactor` set to `1.25`.
2. Audio Transcript UI display floor set to `1.25x`.
3. Test suite adjusted and passing.
4. Version and changelog metadata updated.

## 11. Changelog Note

- Lowered the shared Piper timeline minimum speed floor from `1.30x` to `1.25x`.
- Lowered the Audio Transcript `Voice speed` display floor from `1.30x` to `1.25x`.
- Workspace audio nodes inherit the same `1.25x` floor automatically.

## 12. Task Type Checklist (Stamp [x])

### 12.1 Bugfix

- [x] Có mô tả hành vi hiện tại
- [x] Có root cause ngắn gọn
- [x] Có regression test
- [x] Có xác nhận lỗi cũ không tái diễn

## 13. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/lib/multilingual-audio/piper-tts.test.ts`
- Test commands executed:
  - `npm run test -- --run src/lib/multilingual-audio/piper-tts.test.ts`
  - `npm run test -- --run src/features/audio/chinese-transcription-panel.test.ts`
  - `npm run build`
  - `npm run guard:version`
- Test results summary:
  - All unit tests in `piper-tts.test.ts` (26 tests) and `chinese-transcription-panel.test.ts` (8 tests) passed.
  - Production build compiled successfully.
  - Version guard checked successfully.
- Versioning note:
  - Bumped app version from `0.10.111` to `0.10.112` (PATCH).
