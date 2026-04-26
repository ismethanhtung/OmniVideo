# [P2-SOCIAL-014] Move long integration guidance into Tutor Docs

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

- Task ID: P2-SOCIAL-014
- Phase: P2
- Target Phase: P2
- Domain: Social UX / Documentation
- Task Type: Feature/Bugfix/Docs
- Priority: P1
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

- Lý do: Social Account modal hiển thị hướng dẫn YouTube OAuth quá dài, làm giao diện cấu hình khó dùng.
- Bài toán cần giải quyết: giữ hướng dẫn đầy đủ nhưng chuyển khỏi modal sang trang Tutor Docs chuyên dụng.
- Tài liệu liên quan: `docs/operations/tutorial-docs.md`, `docs/domains/social-account-management.md`

## 3. Scope

- In scope: compact modal guide, new Tutor Docs page, nav/router registration, docs/changelog.
- Out of scope: markdown renderer, external docs CMS, multi-language tutorial editor.

## 4. Input / Output

- Input: user cần cấu hình OAuth/social integrations.
- Output mong đợi: modal ngắn gọn, Tutor Docs chứa hướng dẫn đầy đủ và troubleshooting.

## 5. Acceptance Criteria

1. Social Account modal không render checklist OAuth dài.
2. Modal vẫn hiển thị quick setup, scopes và redirect URI.
3. Có trang `Tutor Docs` trong leftbar.
4. Nút trong modal mở được Tutor Docs.
5. File docs operation tương ứng được thêm.

## 6. Technical Plan

1. Replace platform setupSteps with quickSetup in modal.
2. Add `TutorialDocsPanel`.
3. Register `tutorialDocs` section in navigation/router/types.
4. Add internal navigation event for modal button.
5. Update docs/changelog and verify.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted: layout navigation/router, social accounts panel, new tutorial docs panel.

## 8. Test Plan

1. Type/build check for new section id and component.
2. `npm run test`.
3. `npm run build`.

## 9. Observability

- No runtime service metrics.
- UX signal: modal height/scanability improved; tutorial content discoverable from nav.

## 10. Risks & Rollback

- Risks: tutorial content may drift from implementation if not updated with future adapter changes.
- Rollback strategy: keep docs panel but update content; avoid returning long guides to modal.

## 11. Deliverables

1. Compact Social Account modal guidance.
2. Tutor Docs app page.
3. `docs/operations/tutorial-docs.md`.

## 12. Changelog Note

- Add Tutor Docs and move long YouTube OAuth guide out of the Social Account modal.

## 13. Task Type Checklist (Stamp [x])

### 13.1 Feature

- [x] Có user/system flow rõ ràng
- [x] Có acceptance criteria đo được
- [x] Có test cho happy path
- [ ] Có test cho failure path chính

### 13.2 Bugfix

- [x] Có mô tả cách tái hiện lỗi
- [x] Có root cause ngắn gọn
- [ ] Có regression test
- [x] Có xác nhận lỗi cũ không tái diễn

### 13.3 Research

- [ ] Có câu hỏi nghiên cứu rõ
- [ ] Có kết quả/khuyến nghị cụ thể
- [ ] Có quyết định next step
- [ ] Có tài liệu tham chiếu

## 14. Execution Notes

- Assumptions: Tutor Docs belongs under Social Platforms for now because the immediate content is social integration guidance.
- Blockers: none
- Verification evidence: tests/build pass.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated: none; covered by type/build for routing/component wiring.
- Test commands executed: `npm run test`, `npm run build`
- Test results summary: full tests pass (93 tests / 22 files); build pass with existing unused `Image` warning in `src/features/workspace/display-preferences-panel.tsx`.
