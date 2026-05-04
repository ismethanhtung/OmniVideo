# FAST-GOV-004 Add mandatory automated version bump guard

## 0. Progress Stamp

- [x] DoR checklist completed
- [x] Scope locked
- [x] Implementation completed
- [x] Tests added/updated (if code changed)
- [x] Version guard passed (if runtime changed)
- [x] Docs updated (if impacted)
- [x] Changelog updated
- [x] Ready for review
- [x] Done

## 1. Metadata

- Task ID: FAST-GOV-004
- Phase: P2
- Target Phase: P2
- Domain: Governance / Release
- Task Type: Feature
- Priority: P1
- Size: S
- Owner: AI Agent
- Reviewer: User
- Status: Done

## 2. Context

- Lý do: Version bump thường bị bỏ qua do checklist mềm chưa đủ enforcement kỹ thuật.
- Bài toán cần giải quyết: thêm hard gate tự động để fail khi runtime change mà thiếu version/changelog updates.
- Tài liệu liên quan: `docs/governance/versioning-rules.md`, `docs/governance/definition-of-ready-done.md`, `docs/governance/ai-agent-rules.md`.

## 5. Acceptance Criteria

1. Có script guard tự động kiểm tra runtime changes vs `package.json`, `package-lock.json`, `changelog/changelog.md`.
2. Có npm command chuẩn để chạy guard trong local/CI.
3. Governance docs + task template bắt buộc evidence cho guard.
4. Guard chạy pass trên state hiện tại.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  `scripts/version-guard.mjs`, docs governance, task template.
- Test commands executed:
  `npm run guard:version`
- Test results summary:
  Pass. Guard xác nhận runtime changes đã kèm version + lockfile + changelog updates.
- Version guard command/result (if runtime changed):
  `npm run guard:version` -> `[version-guard] OK: runtime changes include version + lockfile + changelog updates.`
