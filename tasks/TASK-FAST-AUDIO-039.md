# FAST-AUDIO-039 Add Safe Audio Transcript 2 Sandbox Page

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

- Task ID: FAST-AUDIO-039
- Phase: Phase 2
- Target Phase: P2
- Domain: Audio Transcript
- Task Type: Feature
- Priority: P1
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

- Lý do: Owner muốn thử nghiệm các cải tiến timing/VAD an toàn mà không ảnh hưởng trang Audio Transcript đang dùng được.
- Bài toán cần giải quyết: tạo trang `Audio Transcript 2` trong phần More, hiện tại y hệt Audio Transcript nhưng tách session để làm sandbox cho các cải tiến sau.
- Tài liệu liên quan: `docs/governance/testing-rules.md`

## 3. Scope

- In scope: thêm navigation item trong More, route stable `/audio-transcript-2`, render panel Audio Transcript, tách session storage key, add navigation/source tests.
- Out of scope: hiện thực VAD/timeline allocator trong task này.

## 4. Input / Output

- Input: app navigation/content router hiện tại.
- Output mong đợi: có trang Audio Transcript 2 trong More, chạy cùng UI nhưng không đè local session của Audio Transcript gốc.

## 5. Acceptance Criteria

1. Leftbar More có item `Audio Transcript 2`.
2. Route `/audio-transcript-2` resolve về section mới.
3. Content router render Audio Transcript panel cho section mới.
4. Audio Transcript 2 dùng session storage key riêng.
5. Tests verify navigation/router/session markers.

## 6. Technical Plan

1. Add `chineseTranscription2` section id, nav item, slug, legacy resolver entry.
2. Allow `ChineseTranscriptionPanel` to accept a custom session storage key and add a wrapper panel for Audio Transcript 2.
3. Register the new section in content router and update tests.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted: layout navigation/router, Audio Transcript panel session persistence.

## 8. Test Plan

1. Navigation tests: `src/components/layout/navigation.test.ts`.
2. Content router/source tests: `src/components/layout/content-router.test.ts`, `src/features/audio/chinese-transcription-panel.test.ts`.
3. Build + version guard.

## 9. Observability

- Metrics: none.
- Logs: none.
- UI: visible More nav item.

## 10. Risks & Rollback

- Risks: duplicated page initially shares behavior by design; future experiments must be scoped to section 2.
- Rollback strategy: remove new nav item/router mapping/wrapper.

## 11. Deliverables

1. Audio Transcript 2 page in More.
2. Independent session key for page 2.
3. Tests, version bump, changelog, task evidence.

## 12. Changelog Note

- Add Audio Transcript 2 sandbox page under More for safe timing/VAD experiments.

## 13. Task Type Checklist (Stamp [x])

### 13.1 Feature

- [x] Có acceptance criteria rõ ràng
- [x] Có test plan
- [x] Có test evidence

## 14. Execution Notes

- Assumptions: task này chỉ tạo sandbox page an toàn; VAD/timeline allocator sẽ là task sau để tránh làm hỏng Audio Transcript gốc.
- Blockers: None.
- Verification evidence:
  - More navigation now includes `Audio Transcript 2`.
  - `/audio-transcript-2` resolves to `chineseTranscription2`.
  - Content router renders `AudioTranscript2Panel`, which wraps the existing Audio Transcript workflow with an independent storage key.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated: `src/components/layout/navigation.test.ts`, `src/components/layout/content-router.test.ts`, `src/features/audio/chinese-transcription-panel.test.ts`
- Test commands executed: `npm run test -- --run src/components/layout/navigation.test.ts src/components/layout/content-router.test.ts src/features/audio/chinese-transcription-panel.test.ts`; `npm run build`; `npm run guard:version`; `git diff --check`
- Test results summary: targeted tests passed (3 files / 17 tests); production build passed with existing Turbopack warning outside scope; diff whitespace check passed.
- Version guard command/result (if runtime changed): `npm run guard:version` passed after patch bump to `0.4.19`.
