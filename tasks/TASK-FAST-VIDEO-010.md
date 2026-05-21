# [FAST-VIDEO-010] Fix Video Tools Lab asset-picker lifecycle badge wrapping

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

- Task ID: FAST-VIDEO-010
- Phase: FAST
- Target Phase: Video Tools Lab UX polish
- Domain: Video Tools Lab / Shared UI badges
- Task Type: Bugfix
- Priority: P1
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Review

## 2. Context

- User reported CSS break in `Video Tools Lab` asset picker: lifecycle badge `HAS OUTPUT` wraps into two lines and misaligns row layout.
- Root cause: metadata row used `justify-between` without a proper flexible text column, and lifecycle badge component allowed wrapping.
- Related docs: `docs/governance/testing-rules.md`.

## 3. Scope

- In scope:
  - Fix asset row layout so metadata text is `flex-1` with `min-w-0`.
  - Prevent lifecycle badge text wrapping.
  - Keep `Saved setup` badge on one line.
  - Run targeted source-level tests.
- Out of scope:
  - Visual redesign of asset picker card.
  - Changes to lifecycle label semantics/colors.

## 4. Input / Output

- Input: Video Tools Lab asset picker list entries with long metadata and multiple badges.
- Output expected: `RAW`, `HAS OUTPUT`, and `Saved setup` stay inline and no badge wraps to a second line.

## 5. Acceptance Criteria

1. `HAS OUTPUT` badge in Video Tools Lab picker does not wrap to two lines.
2. Metadata text still truncates correctly instead of pushing badges.
3. `Saved setup` badge remains visible and single-line.
4. Targeted tests pass.
5. `npm run guard:version` passes.

## 6. Technical Plan

1. Update shared lifecycle badge component to avoid wrapping.
2. Update Video Tools Lab asset-row flex layout with `flex-1/min-w-0` text and right-side badge group.
3. Run focused tests and version guard, then record evidence.

## 7. Code Change Impact

- Code changed: Yes
- Modules impacted:
  - `src/components/ui/asset-lifecycle-badges.tsx`
  - `src/features/video-processing/video-tools-lab-panel.tsx`
  - release/task tracking files

## 8. Test Plan

1. `npm run test -- --run src/features/video-processing/video-tools-lab-panel.test.ts src/lib/storage/asset-lifecycle-tags.test.ts`
2. `npm run guard:version`

## 9. Observability

- No runtime telemetry changes.
- Behavior is directly visible in Video Tools Lab asset picker UI.

## 10. Risks & Rollback

- Risks:
  - Shared no-wrap badge behavior applies to all places using `AssetLifecycleBadges`; in very narrow containers this may reduce wrap flexibility.
- Rollback strategy:
  - Revert badge no-wrap + picker row layout changes.

## 11. Deliverables

1. Asset picker row no longer breaks when `HAS OUTPUT` badge is present.
2. Shared lifecycle badge rendering hardened to single-line chips.
3. Updated task board/changelog/version metadata.

## 12. Changelog Note

- Fix Video Tools Lab asset picker CSS so lifecycle badges no longer wrap and row metadata stays aligned.

## 13. Task Type Checklist (Stamp [x])

### 13.2 Bugfix

- [x] Có mô tả hành vi hiện tại
- [x] Có root cause ngắn gọn
- [x] Có regression verification
- [x] Có xác nhận không tái diễn

## 14. Execution Notes

- Assumptions:
  - User-facing issue occurs in the shared picker row chip layout, not in data mapping.
  - Keeping chips single-line is preferable to multi-line wraps for dense asset lists.
- Blockers: None.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - No test file edits required (existing tests reused).
- Test commands executed:
  - `npm run test -- --run src/features/video-processing/video-tools-lab-panel.test.ts src/lib/storage/asset-lifecycle-tags.test.ts`
  - `npm run guard:version`
- Test results summary:
  - Targeted source tests pass (2 files / 5 tests).
  - `npm run guard:version` pass.
- Version guard command/result (if runtime changed):
  - `npm run guard:version` pass after patch bump `0.10.14 -> 0.10.15`.
