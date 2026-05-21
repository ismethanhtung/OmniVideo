# [FAST-AUDIO-059] Reduce balanced voice inter-segment max pause to 0.10s

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

- Task ID: FAST-AUDIO-059
- Phase: FAST
- Target Phase: Audio timing polish
- Domain: Multilingual Audio / Piper alignment
- Task Type: Tuning
- Priority: P1
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Review

## 2. Context

- User requested reducing the perceived pause between generated voice sentences.
- Current balanced alignment caps timeline gap pause at `0.3s`, which still sounds too spaced for short text segments.
- Related docs: `docs/domains/multilingual-audio.md`, `docs/governance/testing-rules.md`.

## 3. Scope

- In scope:
  - Reduce balanced alignment max pause cap from `0.3s` to `0.1s`.
  - Update regression test expectations for balanced timeline scheduling.
  - Update board/changelog/version tracking.
- Out of scope:
  - Changing strict alignment behavior.
  - Retuning speed-factor clamp, gap-borrow logic, or sentence split heuristic.

## 4. Input / Output

- Input: translated voice segments with timestamp gaps under `alignmentMode=balanced`.
- Output expected: timeline-inserted silence in balanced mode is capped at `0.1s` per segment transition.

## 5. Acceptance Criteria

1. `PIPER_TTS_ALIGNMENT_SETTINGS.balancedMaxPauseSeconds` equals `0.1`.
2. Balanced alignment test expectations reflect the reduced pause cap.
3. Targeted `piper-tts` tests pass.
4. `npm run guard:version` passes for runtime change governance.

## 6. Technical Plan

1. Update the shared alignment constant in multilingual audio types.
2. Update balanced timeline regression expectation (`pauseBeforeSeconds` and scheduled start).
3. Run focused tests and version guard, then record evidence.

## 7. Code Change Impact

- Code changed: Yes
- Modules impacted:
  - `src/lib/multilingual-audio/types.ts`
  - `src/lib/multilingual-audio/piper-tts.test.ts`
  - Release/task tracking files

## 8. Test Plan

1. `npm run test -- --run src/lib/multilingual-audio/piper-tts.test.ts`
2. `npm run guard:version`

## 9. Observability

- No new metrics/log channels.
- Existing voice alignment diagnostics continue exposing `pauseBeforeSeconds` for verification.

## 10. Risks & Rollback

- Risks:
  - Very sparse scripts may feel slightly more rushed in balanced mode because allowed pause shrinks.
- Rollback strategy:
  - Revert `balancedMaxPauseSeconds` from `0.1` back to `0.3`.

## 11. Deliverables

1. Balanced pause cap reduced to `0.1s`.
2. Updated regression expectation for balanced timeline scheduling.
3. Updated board/changelog/version metadata.

## 12. Changelog Note

- Lower balanced timeline max inter-segment pause from `0.3s` to `0.1s` to tighten generated voice pacing.

## 13. Task Type Checklist (Stamp [x])

### 13.4 Tuning

- [x] Có baseline hành vi trước khi chỉnh
- [x] Có thông số mục tiêu rõ ràng
- [x] Có test hoặc kiểm chứng định lượng sau chỉnh
- [x] Có rollback thông số

## 14. Execution Notes

- Assumptions:
  - User currently uses balanced alignment (default path).
  - Tightening pause cap is preferred over disabling timestamp-preserving gaps entirely.
- Blockers: None.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/lib/multilingual-audio/piper-tts.test.ts`
- Test commands executed:
  - `npm run test -- --run src/lib/multilingual-audio/piper-tts.test.ts`
  - `npm run guard:version`
- Test results summary:
  - `src/lib/multilingual-audio/piper-tts.test.ts`: pass (1 file / 20 tests).
  - `npm run guard:version`: pass.
- Version guard command/result (if runtime changed):
  - `npm run guard:version` pass after patch bump `0.10.13 -> 0.10.14`.
