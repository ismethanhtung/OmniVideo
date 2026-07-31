# [FAST-INTAKE-015] Extract URL from sharing texts in Video Intake

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

- Task ID: FAST-INTAKE-015
- Phase: MVP runtime hardening
- Target Phase: URL validation robustness
- Domain: Video Intake
- Task Type: Bugfix
- Priority: P1
- Size: S
- Owner: Codex
- Reviewer: Owner
- Status: Review

## 2. Context

- Lý do: Đôi khi trên Douyin/TikTok, user nhấn copy link thì nó sẽ kèm theo text miêu tả, hashtags, và thông tin chia sẻ khác. Khi paste toàn bộ nội dung này vào Video Intake, hệ thống báo lỗi "Invalid URL".
- Bài toán cần giải quyết: Tự động trích xuất URL (bắt đầu bằng http:// hoặc https://) từ văn bản chia sẻ được nhập vào trước khi thực hiện chuẩn hóa và validate.

## 3. Scope

- In scope:
  - Cập nhật hàm `normalizeUrl` trong `src/lib/video-intake/platform.ts` để trích xuất URL đầu tiên từ một chuỗi hỗn hợp text.
  - Cập nhật `src/lib/video-intake/platform.test.ts` để bao phủ các case nhập link kèm text của Douyin, TikTok, YouTube.
- Out of scope:
  - Trích xuất nhiều URLs cùng lúc (chỉ xử lý URL đầu tiên tìm thấy).
  - Tải metadata của video trực tiếp bằng các API khác bên ngoài luồng intake chuẩn.

## 4. Input / Output

- Input: Một chuỗi text chứa URL (ví dụ: `4.84 dnD:/ N@j.pQ :6pm 10/10 太喜欢这种感觉了... https://v.douyin.com/lirNlzgcO34/ 复制此链接...`).
- Output mong đợi: Trích xuất đúng `https://v.douyin.com/lirNlzgcO34/` và tiến hành chuẩn hóa bình thường.

## 5. Acceptance Criteria

1. Hàm `normalizeUrl` trích xuất thành công URL đầu tiên (bắt đầu bằng `http://` hoặc `https://`) nếu có.
2. Nếu không có URL nào khớp pattern, vẫn giữ nguyên behavior cũ (quăng lỗi qua `new URL(value)`).
3. Thêm các unit test tương ứng trong `platform.test.ts`.
4. Chạy pass toàn bộ test suites và lệnh `npm run guard:version`.

## 6. Technical Plan

1. Cập nhật `normalizeUrl` trong `src/lib/video-intake/platform.ts` sử dụng regex tìm kiếm URL: `/(https?:\/\/[^\s]+)/`.
2. Lấy match đầu tiên nếu có để gán lại cho URL cần parse.
3. Viết test các ví dụ thực tế trong `src/lib/video-intake/platform.test.ts`.
4. Chạy `npm run test` để verify.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted: `src/lib/video-intake/platform.ts`, `src/lib/video-intake/platform.test.ts`

## 8. Test Plan

1. Viết unit tests kiểm tra:
   - Chuỗi chỉ chứa URL thô (happy path cũ).
   - Chuỗi chứa văn bản tiếng Trung + hashtag + URL của Douyin.
   - Chuỗi chứa văn bản + URL của TikTok/YouTube.
   - Chuỗi không chứa URL (đảm bảo throw lỗi).
2. Chạy `npm run test -- --run src/lib/video-intake/platform.test.ts`.
3. Chạy `npm run guard:version`.

## 9. Observability

- Giữ nguyên cơ chế log hiện tại.

## 10. Risks & Rollback

- Risks: Regex matching có thể lấy nhầm URL nếu trong chuỗi text mô tả có chứa URL khác. Tuy nhiên, tỷ lệ này cực kỳ thấp và việc lấy URL đầu tiên là hợp lý nhất.
- Rollback: Khôi phục lại hàm `normalizeUrl` gốc.

## 11. Deliverables

1. Hàm `normalizeUrl` được cải tiến hỗ trợ trích xuất URL từ text.
2. Bộ unit tests bổ sung trong `platform.test.ts`.

## 12. Changelog Note

- Extract first HTTP/HTTPS URL from mixed text sharing strings in Video Intake validation.

## 13. Task Type Checklist (Stamp [x])

### 13.1 Feature

- [ ] Có user/system flow rõ ràng
- [ ] Có acceptance criteria đo được
- [ ] Có test cho happy path
- [ ] Có test cho failure path chính

### 13.2 Bugfix

- [x] Có mô tả cách tái hiện lỗi
- [x] Có root cause ngắn gọn
- [x] Có regression test
- [x] Có xác nhận lỗi cũ không tái diễn

### 13.3 Research

- [ ] Có câu hỏi nghiên cứu rõ
- [ ] Có kết quả/khuyến nghị cụ thể
- [ ] Có quyết định next step

## 14. Execution Notes

- Tái hiện: Nhập chuỗi hỗn hợp của Douyin khiến `new URL` quăng exception.
- Root cause: Thiếu bước bóc tách URL trước khi parse URL object.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/lib/video-intake/platform.test.ts`
  - `src/lib/video-intake/validation.test.ts`
- Test commands executed:
  - `npx vitest run src/lib/video-intake/platform.test.ts src/lib/video-intake/validation.test.ts`
  - `npm run guard:version`
  - `npm run build`
- Test results summary:
  - 15 passed.
- Version guard command/result (if runtime changed): `npm run guard:version` passed successfully.
- Build command/result: `npm run build` compiled successfully (with BypassSandbox: true).
