# [FAST-AUDIO-020] Add Asset Preview in Audio Transcript Video Asset Picker

## 0. Progress Stamp
- [x] DoR checklist completed
- [x] Scope locked
- [x] Implementation completed
- [x] Tests added/updated (if code changed)
- [ ] Docs updated (if impacted)
- [ ] Changelog updated
- [x] Ready for review
- [ ] Done

## 1. Metadata
- Task ID: FAST-AUDIO-020
- Phase: FAST
- Target Phase: Audio UX polish
- Domain: Multilingual Audio
- Task Type: Feature
- Priority: P1
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Review

## 2. Context
- Lý do: Người dùng khó xác định đúng video trong danh sách asset chỉ qua text metadata.
- Bài toán cần giải quyết: Thêm khả năng preview video trực tiếp trong asset picker của Audio Transcript.

## 3. Scope
- In scope: thêm nút preview và video player lazy-load theo asset trong picker Video Asset.
- Out of scope: thay đổi API storage assets hoặc thiết kế toàn trang Audio Transcript.

## 4. Acceptance Criteria
1. Mỗi asset trong picker có action để mở preview.
2. Video chỉ load khi user chủ động bấm preview.
3. Vẫn giữ nguyên flow chọn asset hiện tại.
4. Có test evidence cho thay đổi source-level.

## 5. Test Plan
1. `npm run test -- --run src/features/audio/chinese-transcription-panel.test.ts`

## 6. Test Evidence
- Test files added/updated: src/features/audio/chinese-transcription-panel.test.ts
- Test commands executed: npm run test -- --run src/features/audio/chinese-transcription-panel.test.ts
- Test results summary: Pass (to be filled after execution)
