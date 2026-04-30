# [FAST-WORKSPACE-008] Remove Douyin Seed, Generalize Language Copy, and Enable URL Intake to Storage

## 0. Progress Stamp

- [x] DoR checklist completed
- [x] Scope locked
- [x] Implementation completed
- [x] Tests added/updated (if code changed)
- [ ] Docs updated (if impacted)
- [x] Changelog updated
- [x] Ready for review
- [x] Done

## 1. Metadata

- Task ID: FAST-WORKSPACE-008
- Phase: FAST
- Target Phase: Workspace runtime UX and flow parity
- Domain: Workspace
- Task Type: Feature
- Priority: P1
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

- Lý do: Workspace vẫn còn seed Douyin cũ, copy hard-code Chinese/ZH, và node `URL Video` chưa chạy được flow intake -> storage như kỳ vọng.
- Bài toán cần giải quyết: Dọn sạch legacy seed trong Workspace page, đổi wording theo hướng đa ngôn ngữ, và cho `URL Video -> Save to Storage` hoạt động giống Video Intake.
- Tài liệu liên quan:
  - `docs/governance/ai-agent-rules.md`
  - `docs/governance/testing-rules.md`
  - `docs/governance/definition-of-ready-done.md`

## 3. Scope

- In scope:
  - Xóa seed Douyin khỏi Workspace page, chỉ giữ `Seed VI Voice Mask Publish`.
  - Đổi copy trong workspace node templates/inspector sang wording trung tính đa ngôn ngữ.
  - Thêm planning + execution cho path `source.url -> storage.upload` qua API Video Intake URL (`/api/video-intake/runs`).
  - Bổ sung test cho workspace graph flow mới.
- Out of scope:
  - Refactor sâu multilingual-audio naming internals (`ChineseTranscription*`) ngoài phạm vi workspace page/flow.

## 4. Input / Output

- Input: User cấu hình node `URL Video` (URL, tags, quality) nối sang `Save to Storage`.
- Output mong đợi: Run workspace tạo asset mới trong storage từ URL intake flow.

## 5. Acceptance Criteria

1. Header actions trong Workspace chỉ còn seed `Seed VI Voice Mask Publish`.
2. Workspace copy không còn hard-code `Chinese`/`ZH->VI` ở các điểm user nêu.
3. Flow `URL Video -> Save to Storage` được planner nhận diện thành executable step và runtime gọi `/api/video-intake/runs` để tạo asset.
4. Có test cho planner flow URL intake -> storage.

## 6. Technical Plan

1. Cập nhật `workspace-canvas-panel.tsx` để bỏ seed Douyin và đổi copy language-neutral.
2. Mở rộng `workspace-graph.ts` với step mới `intake-url-and-store` + mapping planner từ `source.url` sang `storage.upload`.
3. Cập nhật runtime executor trong workspace panel để xử lý step mới và gọi URL intake API.
4. Thêm test cho `planWorkspaceFlow` path URL intake.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted:
  - `src/features/workspace/workspace-canvas-panel.tsx`
  - `src/lib/workspace/workspace-graph.ts`
  - `src/lib/workspace/workspace-graph.test.ts`

## 8. Test Plan

1. Unit test cho `workspace-graph` path URL intake.
2. Build để kiểm tra type/runtime mapping step mới.
3. Failure case chính: URL node thiếu downstream `Save to Storage` vẫn báo lỗi planner.

## 9. Observability

- Metrics: dùng progress/runtime status có sẵn theo node.
- Logs: giữ error messages hiện có của workspace executor và Video Intake API.
- Error codes: reuse error từ `/api/video-intake/runs`.

## 10. Risks & Rollback

- Risks: URL intake phụ thuộc resolver/provider runtime hiện tại của Video Intake.
- Rollback strategy: revert step `intake-url-and-store` và quay lại behavior không executable cho `source.url`.

## 11. Deliverables

1. Workspace page chỉ còn 1 seed action theo yêu cầu.
2. Copy trên workspace node/template liên quan được generalize khỏi Chinese/ZH wording.
3. URL Video node chạy được flow intake -> save to storage.
4. Task, board, changelog, test evidence cập nhật đầy đủ.

## 12. Changelog Note

- Workspace: remove Douyin seed action, generalize language copy, and enable executable URL Video -> Save to Storage intake flow.

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

- Assumptions: URL intake pipeline hiện có của `/api/video-intake/runs` được dùng lại cho workspace.
- Blockers: none.
- Verification evidence:
  - Workspace header chỉ còn `Seed VI Voice Mask Publish`.
  - `Video Dubbing ZH->VI` đổi thành `Video Dubbing` và transcript/dubbing copy chuyển thành language-neutral.
  - Planner tạo step `intake-url-and-store` cho `source.url -> storage.upload`, runtime gọi `/api/video-intake/runs` và map `assetId` về producer.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/lib/workspace/workspace-graph.test.ts`
- Test commands executed:
  - `npm run test -- --run src/lib/workspace/workspace-graph.test.ts`
  - `npm run build`
- Test results summary:
  - Workspace graph tests pass (30 tests / 1 file).
  - Build pass; còn 2 warning cũ ngoài scope: unused `Download` ở Video Tools Lab và unused `Image` ở Display Preferences panel.
