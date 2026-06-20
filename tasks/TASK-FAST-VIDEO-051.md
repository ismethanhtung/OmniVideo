# [FAST-VIDEO-051] Sanitize VIP Output Download Filenames

## 0. Progress Stamp

- [x] DoR checklist completed
- [x] Scope locked
- [x] Implementation completed
- [x] Tests added/updated (if code changed)
- [x] Version guard passed (if runtime changed)
- [x] Changelog updated
- [x] Ready for review
- [x] Done

## 1. Metadata

- Task ID: FAST-VIDEO-051
- Phase: FAST
- Target Phase: VIP output naming correctness
- Domain: Video Pipeline / Workspace VIP / Artifact Download
- Task Type: Bugfix
- Priority: P1
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

- Owner reports VIP workflow output still downloads as `omnivideo-vip-done` in cases where the intended source title contains Vietnamese accents, spaces, punctuation, or overly long text.
- Example problematic title: `Review Full: Thanh mai trúc mã thích bạn thân, cô ấy đền bù anh trai cho tôi`.
- Browser download names should avoid punctuation and accents; only hyphen separators are acceptable in the generated base name.
- Related docs: `docs/SYSTEM-SUMMARY.md`, `docs/governance/ai-agent-rules.md`, `docs/governance/testing-rules.md`.

## 3. Scope

- In scope:
  - Sanitize VIP output filenames from `sourceTitle` or source file name into ASCII alphanumeric words separated only by `-`.
  - Normalize Vietnamese accents and punctuation before adding the existing `.mp4` extension.
  - Harden Workspace server artifact download headers so existing/legacy artifact names are sanitized before browser download.
  - Add regression tests for Vietnamese accented title and artifact header behavior.
- Out of scope:
  - Renaming already stored remote files.
  - Changing user-visible video metadata title/description/hashtags.
  - Changing non-VIP storage asset naming rules.

## 4. Input / Output

- Input: VIP source title or artifact filename with accents, spaces, punctuation, and long text.
- Output mong đợi: Download filename like `Review-Full-Thanh-mai-truc-ma-thich-ban-than-co-ay-den-bu-anh-trai-cho-toi-done.mp4`.

## 5. Acceptance Criteria

1. VIP output filename uses source title when present and removes Vietnamese accents.
2. VIP output filename base contains only ASCII letters, digits, and `-`.
3. Punctuation, whitespace, and repeated separators collapse to a single `-`.
4. Workspace server artifact download headers return the sanitized filename for legacy non-safe artifact names.
5. Focused tests, version guard, build, and diff check pass or failures are documented.

## 6. Technical Plan

1. Add a shared strict download filename sanitizer for ASCII hyphenated bases and extension preservation.
2. Wire VIP output naming through the sanitizer for source title and source filename fallback paths.
3. Wire Workspace server artifact download response headers through the same sanitizer.
4. Add regression coverage for the reported Vietnamese title and server artifact download headers.
5. Update changelog, board, and version metadata.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted:
  - `src/lib/multilingual-audio/video-vip-processing.ts`
  - `src/app/api/workspace/artifacts/[artifactId]/download/route.ts`
  - focused tests

## 8. Test Plan

1. Unit/Integration cần chạy: `npm run test -- --run src/lib/multilingual-audio/video-vip-processing.test.ts src/app/api/workspace/artifacts/[artifactId]/download/route.test.ts`
2. Failure cases cần thử: accented/punctuated title must not leak Unicode, spaces, colon, comma, or fallback to `omnivideo-vip-done`.
3. Kết quả mong đợi: focused tests pass, then `npm run guard:version`, `npm run build`, and `git diff --check` pass.

## 9. Observability

- Metrics: n/a for filename sanitization.
- Logs: existing VIP completion logs retain output filename.
- Error codes: n/a.

## 10. Risks & Rollback

- Risks: Browser behavior can still vary, but response headers and frontend download attribute will now receive a conservative ASCII filename.
- Rollback strategy: revert this task's sanitizer, VIP route/test/changelog/version changes.

## 11. Deliverables

1. Strict VIP output filename sanitization.
2. Defensive server artifact download header sanitization.
3. Regression tests and changelog/task evidence updated.

## 12. Changelog Note

- Tóm tắt dòng changelog dự kiến: Sanitize VIP output download filenames to ASCII hyphenated names so accented/punctuated titles download reliably.

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
- [ ] Có tài liệu tham chiếu

## 14. Execution Notes

- Assumptions: the `.mp4` extension keeps its dot; the "only `-`" rule applies to separators inside the filename base.
- Root cause: previous VIP sanitizer kept only ASCII but did not transliterate Vietnamese accents first, so accented title content was dropped or degraded and punctuation could still produce fragile names.
- Blockers: none.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/lib/multilingual-audio/video-vip-processing.test.ts`
  - `src/app/api/workspace/artifacts/[artifactId]/download/route.test.ts`
- Test commands executed:
  - `npm run test -- --run src/lib/multilingual-audio/video-vip-processing.test.ts src/app/api/workspace/artifacts/[artifactId]/download/route.test.ts`
  - `npm run guard:version`
  - `npm run build`
  - `git diff --check`
- Test results summary:
  - Focused tests pass (2 files / 24 tests).
  - Version guard pass.
  - Build pass.
  - Diff check pass.
