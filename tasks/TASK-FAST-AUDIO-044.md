# FAST-AUDIO-044 Remove Audio Transcript 2 Spleeter and VAD Experiments

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

- Task ID: FAST-AUDIO-044
- Phase: Phase 2
- Target Phase: P2
- Domain: Audio Transcript
- Task Type: Cleanup
- Priority: P0
- Size: M
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

- Lý do: Owner confirmed Audio Transcript 2, Replicate Spleeter, and VAD experiments did not provide useful results and should be removed completely.
- Bài toán cần giải quyết: remove the sandbox page and all related runtime/test code while keeping the original Audio Transcript workflow intact.
- Tài liệu liên quan: `docs/governance/testing-rules.md`

## 3. Scope

- In scope: remove Audio Transcript 2 navigation/router/wrapper/session key, Spleeter code, VAD code, API flags, domain branches, tests, changelog/task evidence.
- Out of scope: removing unrelated Audio Transcript fixes such as translation JSON hardening, timeline workbench, or suspicious word timestamp repair.

## 4. Input / Output

- Input: current experimental Audio Transcript 2 implementation.
- Output mong đợi: only original Audio Transcript remains; no Spleeter/VAD runtime code or UI remains.

## 5. Acceptance Criteria

1. `Audio Transcript 2` no longer appears in navigation or route resolver.
2. `audio-transcript-2-panel`, Replicate Spleeter, and speech activity VAD files are removed.
3. Transcription API/domain no longer accepts or executes Spleeter/VAD flags.
4. Original Audio Transcript tests still pass.
5. Build and version guard pass.

## 6. Technical Plan

1. Remove navigation/router/type entries and wrapper file.
2. Remove Spleeter/VAD domain code, helper files, error codes, and API flags.
3. Update tests/changelog/version and run targeted verification.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted: Audio Transcript, navigation/router, transcription domain tests.

## 8. Test Plan

1. Targeted tests: navigation/content router, Audio Transcript panel, transcription domain/API.
2. Build + version guard.

## 9. Observability

- Metrics: removed experimental steps `separate-vocals`, `detect-speech`, `repair-timestamps`.
- Logs: none.
- Error codes: remove Replicate experimental errors.

## 10. Risks & Rollback

- Risks: removing experiments must not regress original Audio Transcript.
- Rollback strategy: revert this cleanup task if the experiment is wanted later.

## 11. Deliverables

1. Removed Audio Transcript 2 and related experiments.
2. Tests, version bump, changelog, task evidence.

## 12. Changelog Note

- Remove Audio Transcript 2, Replicate Spleeter, and VAD experiments.

## 13. Task Type Checklist (Stamp [x])

### 13.4 Cleanup

- [x] Scope is explicit
- [x] No unrelated cleanup included
- [x] Tests updated

## 14. Execution Notes

- Assumptions: historical changelog/task files remain for audit, but runtime/source/test artifacts for the experiment are removed.
- Blockers: None.
- Verification evidence:
  - Removed Audio Transcript 2 wrapper file and navigation/router/type entries.
  - Removed Spleeter and VAD helper files and stripped API/domain/UI flags.
  - Tests now assert removed routes/flags are absent while original Audio Transcript still passes.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated: `src/components/layout/navigation.test.ts`, `src/components/layout/content-router.test.ts`, `src/features/audio/chinese-transcription-panel.test.ts`, `src/app/api/audio/chinese-transcription/route.test.ts`, `src/lib/multilingual-audio/chinese-transcription.test.ts`
- Test commands executed: `npm run test -- --run src/components/layout/navigation.test.ts src/components/layout/content-router.test.ts src/features/audio/chinese-transcription-panel.test.ts src/app/api/audio/chinese-transcription/route.test.ts src/lib/multilingual-audio/chinese-transcription.test.ts`; `npm run build`; `npm run guard:version`; `git diff --check`
- Test results summary: targeted tests passed (5 files / 23 tests); production build passed with existing Turbopack warning outside scope; diff whitespace check passed.
- Version guard command/result (if runtime changed): `npm run guard:version` passed after patch bump to `0.4.24`.
