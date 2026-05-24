# [FAST-VIDEO-015] Add Split-by-Parts Mode and Refine Video Splitter UX

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

- Task ID: FAST-VIDEO-015
- Phase: MVP runtime hardening
- Target Phase: Video Splitter usability
- Domain: Video Processing
- Task Type: Feature
- Priority: P1
- Size: S
- Owner: Codex
- Reviewer: Owner
- Status: Review

## 2. Context

- Ly do: User can split by fixed minutes but also needs split-by-count (cut in 2, 3, n parts). User also flagged current splitter UI as too rough.
- Bai toan can giai quyet: add count-based splitting mode and improve panel wording/controls while keeping output naming from original filename.

## 3. Scope

- In scope:
  - Add split mode by part count (`splitParts` input).
  - Keep existing interval and head modes.
  - Keep output naming as original basename + `part`.
  - Add `45 phut` interval choice.
  - Update panel copy and tests.
- Out of scope:
  - Background job queue.
  - Split from remote URL/storage directly.

## 4. Input / Output

- Input: local video + mode + value (`30/45/60 phut`, `2..60 parts`, `15/30 phut dau`).
- Output mong doi: zip local download with files named `<original>-part-xxx.mp4`.

## 5. Acceptance Criteria

1. UI has a `Chia theo so phan` mode and numeric input.
2. Backend computes interval from probed duration and requested part count.
3. Interval mode includes `45 phut`.
4. Output archive and segments retain original basename.
5. Focused tests and guard pass.

## 6. Technical Plan

1. Extend split runtime with `parts` mode and duration probing from ffmpeg metadata.
2. Wire `splitParts` through split API route.
3. Update panel controls and copy.
4. Update focused tests.

## 7. Code Change Impact

- Co thay doi code khong: Yes
- Neu Yes, module impacted:
  - `src/lib/video-processing/video-split.ts`
  - `src/app/api/video-processing/split/route.ts`
  - `src/features/video-processing/video-splitter-panel.tsx`
  - related tests

## 8. Test Plan

1. Panel source assertions cover part-count mode and 45-minute option.
2. Split runtime source assertions cover parts mode and naming invariants.
3. Run navigation/router focused regressions.
4. Run guard version.

## 9. Observability

- Keep existing progress-center events and split API error payload shape.

## 10. Risks & Rollback

- Risks: ffmpeg duration metadata probe may fail on malformed media.
- Rollback strategy: remove parts mode path and keep interval/head only.

## 11. Deliverables

1. Split-by-parts mode.
2. Updated splitter UI.
3. Focused tests and governance updates.

## 12. Changelog Note

- Added split-by-parts mode for Video Splitter and refined splitter controls/copy, including 45-minute interval option.

## 13. Task Type Checklist (Stamp [x])

### 13.1 Feature

- [x] Co user/system flow ro rang
- [x] Co acceptance criteria do duoc
- [x] Co test cho happy path
- [x] Co test cho failure path chinh

### 13.2 Bugfix

- [ ] Co mo ta cach tai hien loi
- [ ] Co root cause ngan gon
- [ ] Co regression test
- [ ] Co xac nhan loi cu khong tai dien

### 13.3 Research

- [ ] Co cau hoi nghien cuu ro
- [ ] Co ket qua/khuyen nghi cu the
- [ ] Co quyet dinh next step

## 14. Execution Notes

- Assumptions: equal split by count can be approximated via duration/count with copy segment strategy.
- Blockers: None.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/features/video-processing/video-splitter-panel.test.ts`
  - `src/lib/video-processing/video-split.test.ts`
- Test commands executed:
  - `npm run test -- --run src/features/video-processing/video-splitter-panel.test.ts src/lib/video-processing/video-split.test.ts src/components/layout/navigation.test.ts src/components/layout/content-router.test.ts`
  - `npm run guard:version`
- Test results summary:
  - Focused tests pass.
- Version guard command/result (if runtime changed): `npm run guard:version` pass.
