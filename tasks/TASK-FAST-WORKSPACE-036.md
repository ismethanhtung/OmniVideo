# [FAST-WORKSPACE-036] Add isolated VIP composite Workspace node with 3-node seed

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

- Task ID: FAST-WORKSPACE-036
- Phase: MVP runtime optimization
- Target Phase: Workspace composite processing path
- Domain: Workspace
- Task Type: Feature
- Priority: P1
- Size: M
- Owner: Codex
- Reviewer: Owner
- Status: Review

## 2. Context

- Lý do: Flow `Storage -> Preprocess -> Dubbing -> Mirror -> Blur -> Save` đang chậm vì nhiều pass encode/rerender tuần tự.
- Bài toán cần giải quyết: tạo một node composite riêng (VIP) để gom nhiều bước xử lý vào một runtime path, không ảnh hưởng code path node cũ.
- Tài liệu liên quan: `docs/domains/video-pipeline.md`, `docs/domains/multilingual-audio.md`, `docs/governance/testing-rules.md`

## 3. Scope

- In scope:
  - Thêm node mới `video.vip-processing` cho Workspace runtime.
  - Thêm API composite riêng cho node VIP.
  - Thêm seed mới 3 node: `Storage Asset -> VIP -> Save to Storage`.
  - Hiển thị đầy đủ progress detail trong Background Progress cho step VIP.
- Out of scope:
  - Thay đổi behavior các node cũ (`video.preprocess`, `audio.video-dubbing`, `edit.mirror`, `edit.mask-region`).
  - Triển khai cache transcript/translation/TTS.

## 4. Input / Output

- Input: Storage Asset video và cấu hình VIP node.
- Output mong đợi: Một artifact MP4 cuối cùng đã xử lý composite và có thể lưu qua `Save to Storage`.

## 5. Acceptance Criteria

1. Workspace có node template mới `video.vip-processing` hoạt động độc lập với flow cũ.
2. Planner tạo flow hợp lệ cho đồ thị 3-node `source.asset -> video.vip-processing -> storage.upload`.
3. Runtime step VIP chạy composite pipeline và trả artifact video downstream cho `store-artifact`.
4. Background Progress cho step VIP có detail đầy đủ theo các phase chính (transcript/translation/voice/render).
5. Có test cập nhật cho planner/runtime contracts của node VIP và API route composite.

## 6. Technical Plan

1. Mở rộng `workspace-graph` với node template + flow step mới + seed mới.
2. Thêm API route composite riêng cho VIP node.
3. Gắn runtime execution branch cho step VIP tại Workspace canvas runner.
4. Thêm progress description builder cho VIP result.
5. Cập nhật tests liên quan graph planning và API route.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted: `src/lib/workspace/*`, `src/features/workspace/*`, `src/app/api/audio/*`, `src/lib/multilingual-audio/*`.

## 8. Test Plan

1. Graph planner tests cho node VIP + seed 3-node.
2. API route tests cho VIP composite endpoint.
3. Targeted workspace runtime tests/snapshots nếu impacted.

## 9. Observability

- Metrics: không thêm metric mới, nhưng bổ sung detail progress payload cho VIP.
- Logs: giữ error handling pattern hiện có.
- Error codes: reuse audio/video processing error codes hiện hữu.

## 10. Risks & Rollback

- Risks: Composite path phức tạp hơn một step có thể tăng độ khó debug nếu thiếu phase detail.
- Rollback strategy: remove/disable node template + seed + route mới mà không đụng node cũ.

## 11. Deliverables

1. Node `video.vip-processing` + planner support.
2. Seed `Storage -> VIP -> Save`.
3. Composite API + Workspace runtime integration.
4. Tests + changelog + board update.

## 12. Changelog Note

- Added isolated VIP composite Workspace node and seed to process dubbing + mirror + blur/subtitle in one dedicated runtime path.

## 13. Task Type Checklist (Stamp [x])

### 13.1 Feature

- [x] Có user/system flow rõ ràng
- [x] Có acceptance criteria đo được
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

- Assumptions: ffmpeg/Piper runtime hiện hữu hoạt động như flow hiện tại.
- Blockers: None.
- Verification evidence:
  - Planner hỗ trợ step mới `vip-process-video` và seed mới 3-node.
  - Runtime Workspace đã có branch chạy `/api/audio/video-vip-processing` độc lập.
  - Background Progress step VIP có metadata + stage durations + segment timeline detail.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/lib/workspace/workspace-graph.test.ts`
  - `src/lib/workspace/workspace-seeds.test.ts`
  - `src/app/api/audio/video-vip-processing/route.test.ts`
- Test commands executed:
  - `npm run test -- --run src/lib/workspace/workspace-graph.test.ts src/lib/workspace/workspace-seeds.test.ts src/app/api/audio/video-vip-processing/route.test.ts`
  - `npm run test -- --run src/features/workspace/workspace-canvas-panel.test.ts`
  - `npm run guard:version`
- Test results summary:
  - Targeted tests pass (4 files / 71 tests).
- Version guard command/result (if runtime changed): `npm run guard:version` pass.
