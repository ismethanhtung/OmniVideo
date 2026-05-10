# FAST-AUDIO-032 Increase Min Speed to 1.3 and Scientific TTS Normalization

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

- Task ID: FAST-AUDIO-032
- Phase: Phase 2
- Target Phase: P2
- Domain: Audio Transcript
- Task Type: Bugfix
- Priority: P0
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

- Lý do: TTS Vietnamese vẫn đọc chưa tự nhiên với thuật ngữ như `isothiocyanate`, `enzym myrosinase`, và user yêu cầu tăng min speed từ `1.25` lên `1.3`.
- Bài toán cần giải quyết: nâng speed floor và mở rộng chuẩn hóa text dịch để bản đọc tiếng Việt dễ nghe hơn với thuật ngữ khoa học.
- Tài liệu liên quan: `docs/domains/multilingual-audio.md`, `docs/governance/testing-rules.md`

## 3. Scope

- In scope: speed floor `1.3`, translation prompt update, deterministic normalization for scientific terms, tests, changelog/version/task updates.
- Out of scope: forced phoneme alignment hoặc thay engine TTS.

## 4. Input / Output

- Input: translated segment text cho Vietnamese voice generation.
- Output mong đợi: speed floor `1.3` và text đầu vào Piper dễ đọc hơn cho thuật ngữ khoa học.

## 5. Acceptance Criteria

1. Timeline min speed floor tăng từ `1.25` lên `1.3`.
2. UI voice speed floor hiển thị `1.3`.
3. Normalizer chuyển `isothiocyanate`, `myrosinase`, `enzym/enzyme` sang dạng đọc-friendly.
4. Prompt dịch hướng dẫn rõ cho thuật ngữ khoa học.
5. Regression tests cover các case trên.

## 6. Technical Plan

1. Update speed floor constants và UI format floor.
2. Add deterministic scientific-term normalization trong `normalizeVietnameseTtsText`.
3. Update prompt + tests + run verification/build/guard.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted: `types`, `chinese-transcription-panel`, `transcript-translation`, tests.

## 8. Test Plan

1. Unit tests: `piper-tts`, `transcript-translation`, `chinese-transcription-panel`.
2. Failure checks: scientific term phrases mixed with unit abbreviations.
3. Build + version guard.

## 9. Observability

- Metrics: existing voice speed diagnostics.
- Logs: unchanged.
- Error codes: unchanged.

## 10. Risks & Rollback

- Risks: phonetic rewrite có thể không hoàn hảo cho mọi domain; chỉ áp dụng các case phổ biến đã xác định.
- Rollback strategy: revert new normalization rules.

## 11. Deliverables

1. Speed floor `1.3`.
2. Scientific TTS normalization.
3. Test/changelog/version evidence.

## 12. Changelog Note

- Increase min speed floor to `1.3` and improve Vietnamese TTS normalization for scientific terms.

## 13. Task Type Checklist (Stamp [x])

### 13.2 Bugfix

- [x] Có mô tả cách tái hiện lỗi
- [x] Có root cause ngắn gọn
- [x] Có regression test
- [x] Có xác nhận lỗi cũ không tái diễn

## 14. Execution Notes

- Assumptions: deterministic replacements are preferable for stable TTS output on known problematic terms.
- Blockers: None.
- Verification evidence:
  - Raised timeline min speed floor to `1.3` and updated panel display floor to `1.3`.
  - Added deterministic normalization for scientific terms (`isothiocyanate`, `myrosinase`, `enzyme/enzym`).
  - Updated translation prompt to explicitly request Vietnamese-phonetic rendering for biochemical terms.
  - Targeted tests pass for translation normalization, speed floor, and panel behavior.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/lib/multilingual-audio/transcript-translation.test.ts`
  - `src/lib/multilingual-audio/piper-tts.test.ts`
  - `src/features/audio/chinese-transcription-panel.test.ts`
- Test commands executed:
  - `npm run test -- --run src/lib/multilingual-audio/transcript-translation.test.ts src/lib/multilingual-audio/piper-tts.test.ts src/features/audio/chinese-transcription-panel.test.ts`
  - `npm run build`
  - `npm run guard:version`
- Test results summary:
  - Targeted tests pass (3 files / 31 tests).
  - Build pass with existing Turbopack warning outside scope in `src/app/api/video-processing/edit/route.ts`.
- Version guard command/result (if runtime changed): `npm run guard:version` pass.
