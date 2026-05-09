# FAST-AUDIO-025 Detect Truncation Risk Segments and Raise Min Speed Floor

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

- Task ID: FAST-AUDIO-025
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

- Lý do: Segment can still lose/clip ending words under high speed without being marked as missing by current UI logic.
- Bài toán cần giải quyết: add red flag for likely truncation risk segments and raise min speed floor from 1.1 to 1.2.

## 5. Acceptance Criteria

1. Segments with likely truncation risk are marked red even when timeline/text exist.
2. Min speed floor returns to `1.2`.
3. Targeted tests pass.

## 14. Execution Notes

- Verification evidence: pending.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated: pending.
- Test commands executed: pending.
- Test results summary: pending.
- Version guard command/result (if runtime changed): pending.
