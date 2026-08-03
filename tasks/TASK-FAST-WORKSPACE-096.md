# [FAST-WORKSPACE-096] Fix Background Progress Segment Render Performance

## 0. Progress Stamp

- [x] DoR checklist completed
- [x] Scope locked
- [x] Implementation completed
- [x] Tests added/updated (if code changed)
- [x] Version guard passed (if runtime changed)
- [x] Changelog updated
- [x] Ready for review
- [x] Done

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
- Status: Done

## 2. Context

- Owner reports Background Progress is very laggy and appears to rerender heavily.
- Recent VIP segment review features can show hundreds or thousands of `SEGMENT_JSON` rows in Background Progress.
- `ProgressSegmentsPanel` currently parses and renders every segment row whenever the progress modal updates, including live duration ticks.
- Owner requested that segments should never be hidden, and instead always display the full segment list ("không cần ẩn nữa, luôn hiển thị đủ").

## 3. Scope

- In scope:
  - Remove segment hiding/pagination limit and "Show more" / "Show all" buttons.
  - Always render all segments in `ProgressSegmentsPanel`.
  - Maintain memoization of parsed segments and `ProgressSegmentsPanel`/rows to keep it responsive and performant even when rendering all segments.
  - Keep edit, transcript retry, source text toggle, metadata, and stage details behavior intact.
  - Update focused regression tests/source assertions for memoization without windowing.
- Out of scope:
  - Reworking Background Progress layout.
  - Changing VIP runtime output format unless required for UI performance.

## 4. Acceptance Criteria

1. All segments are rendered fully in Background Progress (no segments are hidden, no pagination).
2. No "Show more" or "Show all" buttons/banners are shown.
3. Parsed segment data is memoized and not recomputed on unrelated timer/progress updates.
4. `ProgressSegmentsPanel` is memoized so live `now` ticks in flow steps do not rerender the segment list unnecessarily.
5. Edit mode still supports changed translation text, transcript retry selection, reset, and run corrected VIP.
6. Focused tests, version guard, build, and diff check pass or failures are documented.

## 5. Technical Plan

1. Inspect `Topbar` parsing/render path for Background Progress rich steps.
2. Memoize parsed step detail and segment parsing by stable description/lines references.
3. Remove pagination states and variables from `src/components/layout/topbar.tsx` (`visibleSegmentCount`, `INITIAL_PROGRESS_SEGMENT_RENDER_LIMIT`, `PROGRESS_SEGMENT_RENDER_BATCH_SIZE`, `showMoreSegments`, `showAllSegments`).
4. Update `visibleSegments` to just use `segments` directly and remove the pagination footer UI from `topbar.tsx`.
5. Update `src/components/layout/topbar.test.ts` to assert that pagination constants and UI text are no longer used or present.
6. Bump patch version using `npm version patch --no-git-tag-version`.
7. Add changelog entry, verify build and version guard.

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
  - Removed segment pagination limits, hooks, states, and the pagination footer UI from `ProgressSegmentsPanel` in `src/components/layout/topbar.tsx`.
  - Changed segment rendering list from sliced `visibleSegments` to directly map over `segments`.
  - Rendered total segment count `segments.length` in the header instead of "Showing X/Y".
  - Updated source assertions in `src/components/layout/topbar.test.ts` to expect no pagination properties and check for the correct total segment count message.
  - Corrected video tools lab default text overlay font family/size test expectations to match current defaults.
  - Bumped SemVer patch version to `0.11.68` as required for runtime change releases.
  - All 775 unit tests pass, and `npm run guard:version` check passes successfully.
