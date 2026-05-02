# [FAST-VIDEO-003] Multi-region interactive blur tool

## 0. Progress Stamp

- [x] DoR checklist completed
- [x] Scope locked
- [ ] Implementation completed
- [x] Implementation completed
- [x] Tests added/updated (if code changed)
- [ ] Docs updated (if impacted)
- [x] Changelog updated
- [x] Ready for review
- [ ] Done

## 1. Metadata

- Task ID: FAST-VIDEO-003
- Phase: P2
- Target Phase: P2
- Domain: Video Processing + Workspace
- Task Type: Feature
- Priority: P1
- Size: M
- Owner: AI Agent
- Reviewer:
- Status: Review

## 2. Context

- Lý do: Blur hiện chỉ một vùng cố định, chưa đủ linh hoạt cho video có nhiều watermark/text.
- Bài toán cần giải quyết: Cho phép user chọn trực tiếp nhiều vùng blur trên preview video, mỗi vùng có timeline/strength.
- Tài liệu liên quan:
  - docs/domains/video-pipeline.md
  - docs/governance/testing-rules.md

## 3. Scope

- In scope:
  - Backend/API hỗ trợ multi-region blur.
  - Video Tools Lab thêm chọn vùng blur trực tiếp và add/remove nhiều vùng.
  - Workspace edit node hỗ trợ nhập danh sách vùng blur để thực thi nhiều vùng.
- Out of scope:
  - Timeline per-region trực quan trên waveform.

## 4. Input / Output

- Input: danh sách vùng blur với x/y/width/height/start/end/strength.
- Output mong đợi: output video blur nhiều vị trí theo cấu hình.

## 5. Acceptance Criteria

1. API `video-processing/edit` nhận và xử lý được danh sách >= 1 blur region.
2. Video Tools Lab cho phép user kéo-thả chọn vùng blur trên preview và thêm nhiều vùng.
3. Workspace node edit cho phép thực thi multi-region blur từ config list.

## 6. Technical Plan

1. Refactor pipeline filter builder từ single-region sang loop multi-region.
2. Mở rộng API parser để nhận `blurRegionsJson` và backward compatible.
3. Cập nhật UI Video Tools Lab + Workspace config.
4. Bổ sung/update tests.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted:
  - src/lib/video-processing/*
  - src/app/api/video-processing/edit/*
  - src/features/video-processing/video-tools-lab-panel.tsx
  - src/features/workspace/workspace-canvas-panel.tsx

## 8. Test Plan

1. Unit/Integration cần chạy:
  - vitest video-edit-pipeline + workspace graph tests.
2. Failure cases cần thử:
  - blurRegionsJson invalid/empty.
  - vùng ngoài range hoặc timeline sai.
3. Kết quả mong đợi:
  - pipeline vẫn backward compatible và multi-region chạy đúng.

## 9. Observability

- Metrics: blur region count trong transform metadata.
- Logs: lỗi parse/config vùng blur.
- Error codes: VAL_VIDEO_EDIT_REGION_INVALID / VAL_VIDEO_EDIT_TIMELINE_INVALID.

## 10. Risks & Rollback

- Risks: UI selection percent lệch theo preview scale.
- Rollback strategy: fallback dùng cấu hình single-region cũ.

## 11. Deliverables

1. Multi-region blur runtime + UI.
2. Test evidence + changelog.

## 12. Changelog Note

- Add interactive multi-region blur editor.

## 13. Task Type Checklist (Stamp [x])

### 13.1 Feature

- [x] Có user/system flow rõ ràng
- [x] Có acceptance criteria đo được
- [ ] Có test cho happy path
- [x] Có test cho happy path
- [x] Có test cho failure path chính

### 13.2 Bugfix

- [ ] Có mô tả cách tái hiện lỗi
- [ ] Có root cause ngắn gọn
- [ ] Có regression test
- [ ] Có xác nhận lỗi cũ không tái diễn

### 13.3 Research

- [ ] Có câu hỏi nghiên cứu rõ
- [ ] Có kết quả/khuyến nghị cụ thể
- [ ] Có quyết định next step
- [ ] Có tài liệu tham chiếu

## 14. Execution Notes

- Assumptions: giữ backward compatibility với payload cũ.
- Blockers:
- Follow-up fix: Video Tools Lab lưu thêm `subtitlePreviewPlacement` theo phần trăm khung preview để khi chọn lại Storage Asset, subtitle mẫu hiển thị đúng vị trí đã kéo; output ffmpeg vẫn dùng ASS margin/alignment hiện có.
- Verification evidence:
  - `npm run test -- src/app/api/video-processing/edit/route.test.ts src/lib/video-processing/video-edit-pipeline.test.ts src/lib/workspace/workspace-graph.test.ts` (pass, 3 files / 46 tests)
  - `npm run build` (pass; chỉ còn warning cũ ngoài scope ở navigation/topbar/audio/display-preferences)

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - src/app/api/video-processing/edit/route.test.ts
  - src/lib/video-processing/video-edit-pipeline.test.ts
- Test commands executed:
  - `npm run test -- src/app/api/video-processing/edit/route.test.ts src/lib/video-processing/video-edit-pipeline.test.ts src/lib/workspace/workspace-graph.test.ts`
  - `npm run build`
- Test results summary:
  - Pass: 3 test files, 46 tests.
  - Build pass.
