# FAST-AUDIO-048 Raise Audio Transcript Voice Speed Floor to 1.40x

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

- Task ID: FAST-AUDIO-048
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

- Lý do: Owner yêu cầu tăng min `Voice speed` tiếp lên `1.40x`.
- Bài toán cần giải quyết: đồng bộ floor runtime + UI từ `1.35x` lên `1.40x`.
- Tài liệu liên quan: `docs/governance/testing-rules.md`

## 3. Scope

- In scope:
  - Tăng `timelineMinSpeedFactor` từ `1.35` lên `1.40`.
  - Tăng floor hiển thị `Voice speed` trong Audio Transcript từ `1.35x` lên `1.40x`.
  - Cập nhật tests liên quan.
- Out of scope:
  - Thay đổi speed cap hoặc logic timeline khác.

## 4. Input / Output

- Input: voice chunk speed metadata.
- Output mong đợi: runtime/UI đều áp dụng floor `1.40x`.

## 5. Acceptance Criteria

1. Runtime speed floor đổi thành `1.40x`.
2. UI `Voice speed` display floor đổi thành `1.40x`.
3. Targeted tests pass.

## 6. Technical Plan

1. Update floor constant in audio types.
2. Update UI speed formatting floor.
3. Update test expectations and run verify/build/guard.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- If Yes, module impacted:
  - `src/lib/multilingual-audio/types.ts`
  - `src/features/audio/chinese-transcription-panel.tsx`
  - `src/lib/multilingual-audio/piper-tts.test.ts`

## 8. Test Plan

1. `npm run test -- --run src/lib/multilingual-audio/piper-tts.test.ts src/features/audio/chinese-transcription-panel.test.ts`
2. `npm run build`
3. `npm run guard:version`

## 9. Observability

- Metrics: none.
- Logs: none.
- Error codes: unchanged.

## 10. Risks & Rollback

- Risks: voice cadence có thể gấp hơn ở vài đoạn.
- Rollback strategy: revert floor về mức cũ.

## 11. Deliverables

1. Floor 1.40 runtime + UI.
2. Updated tests and evidence.

## 12. Changelog Note

- Raise Audio Transcript voice speed floor from `1.35x` to `1.40x`.

## 13. Task Type Checklist (Stamp [x])

### 13.1 Feature

- [x] Có user/system flow rõ ràng
- [x] Có acceptance criteria đo được
- [x] Có test cho happy path
- [x] Có test cho failure path chính

## 14. Execution Notes

- Assumptions: chỉ đổi floor, không đổi logic khác.
- Blockers: None.
- Verification evidence:
  - Updated `timelineMinSpeedFactor` from `1.35` to `1.40`.
  - Updated UI `formatSpeedFactor` display floor from `1.35x` to `1.40x`.
  - Updated timeline tests impacted by new floor (`speedFactor`, `tempoFilter`, warning/scheduling expectations).

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
