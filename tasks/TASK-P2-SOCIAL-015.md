# P2-SOCIAL-015 Social Published Content Inventory

## 0. Progress Stamp

- [x] DoR checklist completed
- [x] Scope locked
- [x] Implementation completed
- [x] Tests added/updated (if code changed)
- [x] Docs updated (if impacted)
- [x] Changelog updated
- [x] Ready for review
- [x] Done

## 1. Metadata

- Task ID: P2-SOCIAL-015
- Phase: P2
- Target Phase: Social Platform MVP
- Domain: Social Account Management
- Task Type: Feature
- Priority: P1
- Size: M
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

- Lý do: Owner cần biết một social account, đặc biệt YouTube channel đã đăng video/short nào, và một video asset đã được đăng lên những nền tảng nào.
- Bài toán cần giải quyết: Publish record hiện có trace asset -> social account, nhưng UI chưa có inventory theo account và theo video; YouTube cũng chưa có luồng đọc danh sách video đã đăng từ channel.
- Tài liệu liên quan: `docs/domains/social-account-management.md`, `docs/architecture/data-model.md`, `docs/operations/tutorial-docs.md`.

## 3. Scope

- In scope:
  - Thêm API inventory gom publish records theo account và theo asset.
  - Với YouTube connected account, thử đọc danh sách upload từ YouTube Data API nếu token có scope phù hợp.
  - Thêm UI Social Published Content để xem account inventory và asset publishing footprint.
  - Cập nhật docs/changelog/task board.
- Out of scope:
  - Real inventory cho Facebook/TikTok/Shopee.
  - Đồng bộ/persist toàn bộ external YouTube history vào MongoDB.
  - Background scheduler đồng bộ định kỳ.

## 4. Input / Output

- Input: Social accounts, publish records, video assets, YouTube OAuth token.
- Output mong đợi: Dashboard inventory hiển thị account đã đăng gì và asset đã xuất hiện ở nền tảng nào.

## 5. Acceptance Criteria

1. Có navigation item Social Platforms -> Published Content.
2. API inventory trả `accounts` với local publish records đã publish/planned/failed và trạng thái YouTube remote fetch rõ ràng.
3. API inventory trả `assets` để xem mỗi video asset đã có publish records ở platform/account nào.
4. YouTube remote inventory fail do thiếu scope/token không làm fail toàn bộ API.
5. Có test bao phủ local aggregation và failure path YouTube remote inventory.

## 6. Technical Plan

1. Thêm domain service `src/lib/social/inventory.ts` cho local aggregation và optional YouTube fetch.
2. Thêm route `GET /api/social/published-content`.
3. Thêm panel UI và navigation/content router.
4. Cập nhật OAuth/docs để nêu scope đọc YouTube inventory.
5. Thêm tests và chạy verification.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted: `src/lib/social`, `src/app/api/social`, `src/features/social`, layout navigation.

## 8. Test Plan

1. Unit/API cần chạy: inventory unit tests, API route test, social tests liên quan.
2. Failure cases cần thử: YouTube account thiếu token/scope hoặc provider API fail vẫn trả inventory local.
3. Kết quả mong đợi: Tests pass, build pass nếu khả thi.

## 9. Observability

- Metrics: Chưa thêm metrics mới trong MVP.
- Logs: Không log token/secret.
- Error codes: `AUTH_YOUTUBE_ACCESS_TOKEN_MISSING`, `AUTH_YOUTUBE_SCOPE_MISSING`, `PRV_YOUTUBE_INVENTORY_FAILED`.

## 10. Risks & Rollback

- Risks: YouTube inventory cần scope đọc (`youtube.readonly`) nên account đã connect trước đó có thể cần OAuth reconnect.
- Rollback strategy: Gỡ navigation/panel/route và giữ publish records hiện có không ảnh hưởng.

## 11. Deliverables

1. API social published content inventory.
2. UI Social Published Content.
3. Tests + docs/changelog updates.

## 12. Changelog Note

- Thêm Social Published Content inventory để xem video đã đăng theo account và footprint theo video asset.

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

- Assumptions: YouTube external list chỉ là live fetch best-effort; nguồn sự thật nội bộ vẫn là `publish_records`.
- Blockers:
- Verification evidence: `npm run test` pass (97 tests / 24 files); `npm run build` pass, còn warning cũ unused `Image` trong `display-preferences-panel.tsx`.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated: `src/lib/social/inventory.test.ts`, `src/app/api/social/published-content/route.test.ts`.
- Test commands executed: `npm run test -- --run src/lib/social/inventory.test.ts src/app/api/social/published-content/route.test.ts`; `npm run test`; `npm run build`.
- Test results summary: Targeted tests pass (4 tests / 2 files); full Vitest pass (97 tests / 24 files); Next build pass with pre-existing unused `Image` warning.
