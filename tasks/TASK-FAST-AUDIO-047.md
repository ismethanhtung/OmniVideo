# FAST-AUDIO-047 Raise Audio Transcript Voice Speed Floor to 1.35x

## 0. Progress Stamp

- [x] DoR checklist completed
- [x] Scope locked
- [x] Implementation completed
- [x] Tests added/updated (if code changed)
- [x] Version guard passed (if runtime changed)
- [x] Docs updated (if impacted)
- [x] Changelog updated
- [x] Ready for review
- [ ] Done

## 1. Metadata

- Task ID: FAST-AUDIO-047
- Phase: Phase 2
- Target Phase: P2
- Domain: Audio Transcript
- Task Type: Feature
- Priority: P1
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Review

## 2. Context

- Lý do: Owner yêu cầu tăng `Voice speed` minimum từ `1.25x` lên `1.35x`.
- Bài toán cần giải quyết: đồng bộ floor ở runtime timeline speed và UI display trong Audio Transcript.
- Tài liệu liên quan: `docs/governance/testing-rules.md`

## 3. Scope

- In scope:
  - Tăng `timelineMinSpeedFactor` từ `1.25` lên `1.35`.
  - Tăng floor hiển thị `Voice speed` trong Audio Transcript lên `1.35x`.
  - Cập nhật tests liên quan.
- Out of scope:
  - Thay đổi speed cap hoặc logic căn timeline khác ngoài floor.

## 4. Input / Output

- Input: voice timeline/chunk speed metadata.
- Output mong đợi: runtime và UI đều không hiển thị/áp dụng dưới `1.35x` trong các case cần speed floor.

## 5. Acceptance Criteria

1. Runtime speed floor đổi thành `1.35x`.
2. Audio Transcript `Voice speed` display floor đổi thành `1.35x`.
3. Targeted tests pass.

## 6. Technical Plan

1. Update constants in multilingual audio types/runtime.
2. Update Audio Transcript speed formatting floor.
3. Update affected tests and run verification.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted:
  - `src/lib/multilingual-audio/types.ts`
  - `src/features/audio/chinese-transcription-panel.tsx`
  - `src/lib/multilingual-audio/piper-tts.test.ts`

## 8. Test Plan

1. Run `src/lib/multilingual-audio/piper-tts.test.ts`.
2. Run `src/features/audio/chinese-transcription-panel.test.ts` (source assertions).
3. Build + guard version.

## 9. Observability

- Metrics: none.
- Logs: none.
- Error codes: unchanged.

## 10. Risks & Rollback

- Risks: speech may sound more rushed in some segments.
- Rollback strategy: revert floor constants/display back to previous value.

## 11. Deliverables

1. Speed floor 1.35 runtime + UI.
2. Updated tests and evidence.

## 12. Changelog Note

- Raise Audio Transcript voice speed floor from `1.25x` to `1.35x`.

## 13. Task Type Checklist (Stamp [x])

### 13.1 Feature

- [x] Có user/system flow rõ ràng
- [x] Có acceptance criteria đo được
- [x] Có test cho happy path
- [x] Có test cho failure path chính

## 14. Execution Notes

- Assumptions: request only changes floor, not broader alignment behavior.
- Blockers: None.
- Verification evidence:
  - Updated `timelineMinSpeedFactor` from `1.25` to `1.35` in core audio settings.
  - Updated Audio Transcript speed display floor from `1.25x` to `1.35x`.
  - Updated timeline tests where min speed floor impacts expected `speedFactor`, `tempoFilter`, and balanced scheduling.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/lib/multilingual-audio/piper-tts.test.ts`
- Test commands executed:
  - `npm run test -- --run src/lib/multilingual-audio/piper-tts.test.ts src/features/audio/chinese-transcription-panel.test.ts`
  - `npm run build`
  - `npm run guard:version`
- Test results summary:
  - Targeted tests passed (2 files / 26 tests).
  - Build passed (existing Turbopack warning outside scope remains).
- Version guard command/result (if runtime changed):
  - `npm run guard:version` passed after version/lockfile/changelog update.
