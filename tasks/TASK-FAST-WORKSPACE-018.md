# [FAST-WORKSPACE-018] Remove duplicate transcript/voice branch from Seed Asset Transcript Full Processing

## 0. Progress Stamp

- [x] DoR checklist completed
- [x] Scope locked
- [x] Implementation completed
- [x] Tests added/updated (if code changed)
- [x] Docs updated (if impacted)
- [x] Changelog updated
- [x] Ready for review
- [ ] Done

## 1. Metadata

- Task ID: FAST-WORKSPACE-018
- Phase: FAST
- Target Phase: Workspace seed correctness and runtime cost
- Domain: Workspace / Flow Planning
- Task Type: Bugfix
- Priority: P0
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Review

## 2. Context

- Lý do:
  - User phản ánh flow `Seed Asset Transcript Full Processing` có khả năng chạy lặp lại pipeline transcript/translate/voice dù node `Video Dubbing` đã làm các bước này.
- Bài toán cần giải quyết:
  - Loại bỏ cấu trúc seed gây chạy trùng, giảm thời gian và chi phí.
  - Vẫn giữ khả năng subtitle overlay và VI metadata dựa trên translation output từ `Video Dubbing`.
- Tài liệu liên quan:
  - `docs/governance/ai-agent-rules.md`
  - `docs/governance/testing-rules.md`
  - `docs/architecture/node-architecture.md`

## 3. Scope

- In scope:
  - Cập nhật seed `asset-transcript-full-processing` để bỏ nhánh `Audio Transcript -> Translate -> Voice Generation` trùng lặp.
  - Cho phép planner nhận transcript output từ `audio.video-dubbing` cho `text.generate-vi-metadata` và `edit.mask-region`.
  - Bổ sung/cập nhật test regression cho planner + seed.
- Out of scope:
  - Refactor tổng thể planner theo topo-sort generic.
  - Thay đổi API backend audio/video.

## 4. Input / Output

- Input: Workspace seed `Seed Asset Transcript Full Processing` hiện tại.
- Output mong đợi:
  - Seed chạy theo một nhánh dubbing chính, không lặp transcript/voice generation.
  - Metadata/subtitle vẫn dùng được translation từ `Video Dubbing`.

## 5. Acceptance Criteria

1. Seed `asset-transcript-full-processing` không còn node `audio.chinese-transcribe`, `text.translate-transcript`, `audio.voice-generation`.
2. Seed vẫn có các bước: `source.asset -> video.preprocess -> audio.video-dubbing -> edit.mirror -> edit.mask-region -> storage.upload`.
3. `Generate VI Metadata` có thể nhận transcript output từ `audio.video-dubbing`.
4. `edit.mask-region` có thể nhận transcript upstream từ `audio.video-dubbing`.
5. Test liên quan pass và có regression coverage cho seed/planner path mới.

## 6. Technical Plan

1. Cập nhật output port của `audio.video-dubbing` để expose translated transcript.
2. Cập nhật planner cho `generate-vi-metadata` và `edit-video` chấp nhận upstream `audio.video-dubbing` transcript.
3. Cập nhật seed graph và seed description.
4. Bổ sung regression tests cho plan step order và seed topology mới.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Module impacted:
  - `src/lib/workspace/workspace-graph.ts`
  - `src/lib/workspace/workspace-graph.test.ts`
  - `src/lib/workspace/workspace-seeds.ts`
  - `src/lib/workspace/workspace-seeds.test.ts`
  - `tasks/board.md`
  - `changelog/changelog.md`

## 8. Test Plan

1. Chạy test focus cho workspace graph + seeds.
2. Chạy `npm run guard:version`.

## 9. Observability

- Không thêm metrics/log mới.
- Không thay đổi error taxonomy.

## 10. Risks & Rollback

- Risks:
  - Planner nhận thêm source transcript từ dubbing có thể ảnh hưởng một số flow legacy dùng assertion message cũ.
- Rollback:
  - Revert các thay đổi `workspace-graph` + seed.

## 11. Deliverables

1. Seed full processing bỏ nhánh xử lý trùng.
2. Planner hỗ trợ transcript output từ dubbing cho metadata/edit.
3. Regression tests cập nhật.
4. Task/changelog cập nhật.

## 12. Changelog Note

- Workspace: remove duplicated transcript/voice branch in full-processing seed and reuse transcript output from video dubbing for metadata/subtitle steps.

## 13. Task Type Checklist (Stamp [x])

### 13.1 Bugfix

- [x] Có mô tả cách tái hiện lỗi
- [x] Có root cause ngắn gọn
- [x] Có regression test
- [x] Có xác nhận lỗi cũ không tái diễn

## 14. Execution Notes

- Root cause:
  - Seed topology đồng thời chứa `audio.video-dubbing` và nhánh `transcribe -> translate -> voice`, dẫn tới xử lý lặp.
- Fix summary:
  - Seed chuyển sang một nhánh dubbing chính; transcript output của dubbing được nối sang metadata + mask subtitle.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/lib/workspace/workspace-graph.test.ts`
  - `src/lib/workspace/workspace-seeds.test.ts`
- Test commands executed:
  - `npm run test -- --run src/lib/workspace/workspace-graph.test.ts src/lib/workspace/workspace-seeds.test.ts`
  - `npm run build`
  - `npm run guard:version`
- Test results summary:
  - Focused tests pass (2 files / 45 tests).
  - Build pass; vẫn còn warning ESLint circular-config cũ ngoài scope task.
  - Version guard pass.
