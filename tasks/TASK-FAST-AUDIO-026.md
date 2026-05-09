# FAST-AUDIO-026 Mark Red Only for Actual Voice Text Loss

## 0. Progress Stamp

- [x] DoR checklist completed
- [x] Scope locked
- [x] Implementation completed
- [x] Tests added/updated (if code changed)
- [ ] Version guard passed (if runtime changed)
- [x] Docs updated (if impacted)
- [ ] Changelog updated
- [x] Ready for review
- [ ] Done

## 1. Metadata

- Task ID: FAST-AUDIO-026
- Phase: Phase 2
- Target Phase: P2
- Domain: Audio Transcript
- Task Type: Bugfix
- Priority: P0
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Review

## 2. Context

- Lý do: current red highlight over-flags segments that are not actually missing spoken text.
- Bài toán cần giải quyết: only mark red when segment has actual text loss in generated voice or missing generated voice output.

## 5. Acceptance Criteria

1. Segment red state is removed for generic risk-only warnings.
2. Segment red state remains for missing generated voice.
3. Segment red state appears for strict timeline segments where speed cap forces audio trim (actual text loss condition).
4. Targeted tests pass.

## 14. Execution Notes

- Verification evidence: pending.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated: pending.
- Test commands executed: pending.
- Test results summary: pending.
- Version guard command/result (if runtime changed): pending.
