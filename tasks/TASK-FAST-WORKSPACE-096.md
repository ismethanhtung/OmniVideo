# [FAST-WORKSPACE-096] Fix Background Progress Segment Render Performance

## 0. Progress Stamp

- [x] DoR checklist completed
- [x] Scope locked
- [ ] Implementation completed
- [ ] Tests added/updated (if code changed)
- [ ] Version guard passed (if runtime changed)
- [ ] Changelog updated
- [ ] Ready for review
- [ ] Done

## 1. Metadata

- Task ID: FAST-WORKSPACE-096
- Phase: FAST
- Target Phase: Workspace Background Progress
- Domain: Workspace / Background Progress / UI Performance
- Task Type: Bugfix
- Priority: P0
- Size: M
- Owner: AI Agent
- Reviewer: Owner
- Status: In Progress

## 2. Context

- Owner reports Background Progress is very laggy and appears to rerender heavily.
- Recent VIP segment review features can show hundreds or thousands of `SEGMENT_JSON` rows in Background Progress.
- `ProgressSegmentsPanel` currently parses and renders every segment row whenever the progress modal updates, including live duration ticks.

## 3. Scope

- In scope:
  - Reduce parsing and React render work for Background Progress segment details.
  - Avoid full segment list re-rendering when only task timing/progress ticks change.
  - Keep edit, transcript retry, source text toggle, metadata, and stage details behavior intact.
  - Add focused regression tests/source assertions for memoization/windowed rendering.
- Out of scope:
  - Reworking Background Progress layout.
  - Changing VIP runtime output format unless required for UI performance.

## 4. Acceptance Criteria

1. Opening Background Progress on a VIP result with many segments does not render every segment row at once.
2. Parsed segment data is memoized and not recomputed on unrelated timer/progress updates.
3. `ProgressSegmentsPanel` is memoized so live `now` ticks in flow steps do not rerender the segment list unnecessarily.
4. Edit mode still supports changed translation text, transcript retry selection, reset, and run corrected VIP.
5. Focused tests, version guard, build, and diff check pass or failures are documented.

## 5. Technical Plan

1. Inspect `Topbar` parsing/render path for Background Progress rich steps.
2. Memoize parsed step detail and segment parsing by stable description/lines references.
3. Window the segment rows to a bounded batch with explicit "Show more" controls and render all rows only in edit mode.
4. Memoize `ProgressSegmentsPanel` and row components so live elapsed time updates do not repaint segment DOM.
5. Update focused tests, bump patch version, update changelog/task/board, and verify.

## 6. Code Change Impact

- Co thay doi code khong: Yes
- Neu Yes, module impacted:
  - `src/components/layout/topbar.tsx`
  - `src/components/layout/topbar.test.ts`
  - release metadata

## 7. Test Plan

1. Focused commands:
   - `npm run test -- --run src/components/layout/topbar.test.ts src/lib/ui/progress-center.test.ts src/features/workspace/workspace-canvas-panel.test.ts`
2. Required checks:
   - `npm run guard:version`
   - `npm run build`
   - `git diff --check`

## 8. Observability

- Background Progress remains visually identical for normal-sized task details, but large segment lists render in bounded batches.

## 9. Risks & Rollback

- Risks: Windowing could hide segments until "Show more" is clicked; edit mode must still expose all editable rows.
- Rollback strategy: revert this task's Topbar performance changes, tests, changelog, and version bump.

## 10. Deliverables

1. Optimized Background Progress segment rendering.
2. Regression tests/source assertions.
3. Release metadata and verification evidence.

## 11. Changelog Note

- Tom tat dong changelog du kien: Fix Background Progress lag by memoizing and windowing large VIP segment lists.

## 12. Task Type Checklist (Stamp [x])

### 12.1 Bugfix

- [x] Co mo ta cach tai hien loi
- [x] Co root cause ngan gon
- [x] Co regression test
- [x] Co xac nhan loi cu khong tai dien

### 12.2 Feature

- [ ] Co user/system flow ro rang
- [ ] Co acceptance criteria do duoc
- [ ] Co test cho happy path
- [ ] Co test cho failure path chinh

### 12.3 Research

- [ ] Co cau hoi nghien cuu ro
- [ ] Co ket qua/khuyen nghi cu the

## 13. Execution Notes

- Implementation:
  - Pending.
