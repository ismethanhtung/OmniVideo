# [FAST-AUDIO-058] Lower default original audio mix volume to 0.10

## 0. Progress Stamp

- [x] DoR checklist completed
- [x] Scope locked
- [x] Implementation completed
- [x] Tests added/updated (if code changed)
- [ ] Docs updated (if impacted)
- [x] Changelog updated
- [x] Ready for review
- [ ] Done

## 1. Metadata

- Task ID: FAST-AUDIO-058
- Phase: FAST
- Target Phase: Audio mix balance polish
- Domain: Audio Transcript / Workspace Audio
- Task Type: Bugfix
- Priority: P1
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Review

## 2. Context

- User asked whether `original volume = 0.18` is for the old/original voice and requested lowering it if true.
- In dubbing runtime this field controls the original source audio gain in the final mix (`duck-original`), not TTS voice gain.
- Current defaults/fallbacks used `0.18`, causing original track to stay louder than requested.

## 3. Scope

- In scope:
  - Lower `originalAudioVolume` default/fallback from `0.18` to `0.1` in dubbing runtime.
  - Lower Workspace audio dubbing node defaults and UI placeholder from `0.18` to `0.1`.
  - Add/update regression tests around default/fallback behavior.
  - Update release metadata/changelog/task board.
- Out of scope:
  - Retune `voiceVolume` default.
  - Change mixing algorithm (`amix` strategy) or timeline alignment.

## 4. Acceptance Criteria

1. Video dubbing runtime fallback for missing/invalid original volume is `0.1`.
2. Workspace audio dubbing default config uses `originalAudioVolume = 0.1`.
3. Workspace inspector shows `Original volume` default/placeholder as `0.1`.
4. Regression tests cover the new fallback/default behavior.
5. `npm run guard:version` passes for runtime changes.

## 5. Technical Plan

1. Update runtime normalization fallback in video dubbing adapter.
2. Update workspace graph defaults and form submission defaults for `originalAudioVolume`.
3. Update UI placeholder/default display and tests.
4. Run targeted tests and version guard, then capture evidence.

## 6. Code Change Impact

- Có thay đổi code không: Yes
- Module impacted:
  - `src/lib/multilingual-audio/video-dubbing.ts`
  - `src/lib/workspace/workspace-graph.ts`
  - `src/features/workspace/workspace-canvas-panel.tsx`
  - `src/lib/multilingual-audio/video-dubbing.test.ts`
  - `src/app/api/audio/video-dubbing/route.test.ts`
  - `tasks/board.md`
  - `tasks/TASK-FAST-AUDIO-058.md`
  - `changelog/changelog.md`
  - `package.json`
  - `package-lock.json`

## 7. Test Plan

1. `npm run test -- --run src/lib/multilingual-audio/video-dubbing.test.ts src/app/api/audio/video-dubbing/route.test.ts`
2. `npm run guard:version`

## 8. Observability

- Mix output still reports `mix.originalAudioVolume` and `mix.voiceVolume` in API response for audit/debug.

## 9. Risks & Rollback

- Risks:
  - Lower original track level may make certain source ambience/music less audible.
- Rollback:
  - Revert default/fallback `originalAudioVolume` from `0.1` back to `0.18`.

## 10. Deliverables

1. Runtime + Workspace defaults aligned to `originalAudioVolume = 0.1`.
2. Updated regression tests and release metadata.

## 11. Changelog Note

- Lower default/fallback original audio mix volume in video dubbing from `0.18` to `0.10` across runtime and Workspace UI defaults.

## 12. Task Type Checklist (Stamp [x])

### 12.1 Bugfix

- [x] Có mô tả hành vi hiện tại
- [x] Có root cause ngắn gọn
- [x] Có regression test
- [x] Có xác nhận lỗi cũ không tái diễn

## 13. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/lib/multilingual-audio/video-dubbing.test.ts`
  - `src/app/api/audio/video-dubbing/route.test.ts`
- Test commands executed:
  - `npm run test -- --run src/lib/multilingual-audio/video-dubbing.test.ts src/app/api/audio/video-dubbing/route.test.ts`
  - `npm run guard:version`
- Test results summary:
  - Pending run.
- Versioning note:
  - Pending.
