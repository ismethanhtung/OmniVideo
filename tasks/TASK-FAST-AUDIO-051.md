# FAST-AUDIO-051 Audio Transcript 2 Clone and Video Speed Preprocess

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

- Task ID: FAST-AUDIO-051
- Phase: Phase 2
- Target Phase: P2
- Domain: Audio Transcript
- Task Type: Feature
- Priority: P0
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Review

## 2. Context

- Lý do: cần một trang Audio Transcript 2 để thử nghiệm tính năng mới trước khi tích hợp ngược về Audio Transcript chính.
- Bài toán cần giải quyết: clone trang Audio Transcript thành Audio Transcript 2 và thêm block tiền xử lý video ngay sau Source Video, trước mắt chỉ có điều chỉnh tốc độ video (ví dụ 0.6x).
- Tài liệu liên quan: `docs/governance/testing-rules.md`

## 3. Scope

- In scope:
  - Thêm nav section `Audio Transcript 2` route riêng.
  - Clone hành vi Audio Transcript sang trang mới.
  - Thêm block `Video Preprocess` sau `Source Video` với điều chỉnh tốc độ.
  - Nối tốc độ vào API transcription để ffmpeg xử lý audio theo speed factor trước khi gọi Groq.
  - Cập nhật tests liên quan.
- Out of scope:
  - Các chức năng tiền xử lý khác ngoài speed factor.
  - Refactor lớn workflow transcript hiện tại.

## 4. Input / Output

- Input: video file hoặc storage asset + speed factor (mặc định 0.6x ở Audio Transcript 2).
- Output mong đợi: transcription pipeline chạy trên media đã được tiền xử lý tốc độ theo giá trị chọn.

## 5. Acceptance Criteria

1. Leftbar có thêm mục `Audio Transcript 2` và mở được trang mới.
2. Audio Transcript 2 hiển thị block `Video Preprocess` ngay sau `Source Video`.
3. Block preprocess có điều chỉnh tốc độ và mặc định `0.6x` cho trang mới.
4. API transcription nhận speed factor và ffmpeg áp dụng tốc độ tương ứng trước khi transcription.
5. Tests liên quan pass.

## 6. Technical Plan

1. Đăng ký section ID/slug/nav cho Audio Transcript 2 và map sang panel mới.
2. Mở rộng panel Audio Transcript để hỗ trợ biến thể preprocess bật/tắt theo props.
3. Truyền `videoSpeedFactor` từ UI -> API -> extraction layer và cập nhật validation/tests.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted:
  - `src/components/layout/types.ts`
  - `src/components/layout/navigation.ts`
  - `src/components/layout/navigation.test.ts`
  - `src/components/layout/content-router.tsx`
  - `src/features/audio/chinese-transcription-panel.tsx`
  - `src/features/audio/chinese-transcription-panel.test.ts`
  - `src/features/audio/chinese-transcription-v2-panel.tsx`
  - `src/app/api/audio/chinese-transcription/route.ts`
  - `src/lib/multilingual-audio/types.ts`
  - `src/lib/multilingual-audio/validation.ts`
  - `src/lib/multilingual-audio/audio-extraction.ts`
  - `src/lib/multilingual-audio/audio-extraction.test.ts`
  - `src/lib/multilingual-audio/chinese-transcription.ts`
  - `src/lib/multilingual-audio/chinese-transcription.test.ts`

## 8. Test Plan

1. `npm run test -- --run src/components/layout/navigation.test.ts src/lib/multilingual-audio/audio-extraction.test.ts src/lib/multilingual-audio/chinese-transcription.test.ts src/features/audio/chinese-transcription-panel.test.ts`
2. `npm run guard:version`

## 9. Observability

- Metrics: none.
- Logs: none.
- Error codes: reuse existing validation/audio extraction codes.

## 10. Risks & Rollback

- Risks: speed factor thấp có thể làm audio dài hơn và tăng thời gian xử lý.
- Rollback strategy: tắt preprocess ở Audio Transcript 2 hoặc bỏ truyền `videoSpeedFactor`.

## 11. Deliverables

1. Trang Audio Transcript 2 khả dụng.
2. Block Video Preprocess có speed control.
3. Runtime transcription hỗ trợ speed factor.
4. Test evidence đầy đủ.

## 12. Changelog Note

- Add Audio Transcript 2 clone page with video speed preprocess (0.6x default) wired into transcription extraction.

## 13. Task Type Checklist (Stamp [x])

### 13.1 Feature

- [x] Có user/system flow rõ ràng
- [x] Có acceptance criteria đo được
- [x] Có test cho happy path
- [x] Có test cho failure path chính

## 14. Execution Notes

- Assumptions: Audio Transcript gốc giữ nguyên behavior, preprocess bật riêng cho Audio Transcript 2.
- Blockers: none.
- Verification evidence: sẽ cập nhật ở section 15.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/components/layout/navigation.test.ts`
  - `src/lib/multilingual-audio/audio-extraction.test.ts`
  - `src/lib/multilingual-audio/chinese-transcription.test.ts`
  - `src/features/audio/chinese-transcription-panel.test.ts`
  - `src/lib/multilingual-audio/video-preprocess.test.ts`
  - `src/lib/multilingual-audio/video-dubbing.ts`
  - `src/app/api/audio/video-preprocess/route.ts`
- Test commands executed:
  - `npm run test -- --run src/components/layout/navigation.test.ts src/lib/multilingual-audio/audio-extraction.test.ts src/lib/multilingual-audio/chinese-transcription.test.ts src/features/audio/chinese-transcription-panel.test.ts`
  - `npm run test -- --run src/lib/multilingual-audio/video-preprocess.test.ts src/features/audio/chinese-transcription-panel.test.ts src/lib/multilingual-audio/video-dubbing.test.ts`
  - `npm run test -- --run src/features/audio/chinese-transcription-panel.test.ts src/lib/multilingual-audio/chinese-transcription.test.ts src/lib/multilingual-audio/video-preprocess.test.ts`
  - `npm run guard:version`
- Test results summary:
  - tests pass (`4 files`, `22 tests`).
  - preprocess/dubbing tests pass (`3 files`, `12 tests`).
  - summary/timing tests pass (`3 files`, `10 tests`).
- Version guard command/result (if runtime changed):
  - `npm run guard:version` pass (`[version-guard] OK`).
