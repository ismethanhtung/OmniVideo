# [FAST-AUDIO-081] Keep Neutral Confrontational Pronouns in VIP Translation

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

- Task ID: FAST-AUDIO-081
- Phase: FAST
- Target Phase: Workspace VIP
- Domain: Multilingual Audio / Translation
- Task Type: Bugfix
- Priority: P0
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

- Owner reported VIP translation segments such as `你`, `我`, `对`, `就是你` being translated as `Cô`, `Tôi?`, `Đúng`, `Chính là cô`.
- In the scene, a female character is pointing at a male character. The correct force is closer to `Ngươi`, `Ta?`, `Đúng`, `Chính là ngươi`.
- The current prompt already warns against cross-gender mistakes, but it still allows overly polite/gendered direct address like `cô/tôi` for short bare pronoun lines.

## 3. Scope

- In scope:
  - Strengthen runtime VIP transcript translation prompt for short direct-dialogue pronoun lines.
  - Strengthen single-segment fallback translation prompt with the same rule.
  - Align the Workspace default translation prompt text with the runtime rule.
  - Add prompt regression tests.
- Out of scope:
  - Re-translating existing saved VIP outputs.
  - Full dialogue-speaker diarization.
  - Scene-specific manual override UI.

## 4. Acceptance Criteria

1. Chunk translation prompt explicitly treats short bare pronoun lines like `你`, `我`, `就是你` as context-sensitive direct address.
2. Prompt instructs the model not to translate `你` as `cô/anh` or `我` as `tôi` purely from gender/audience assumptions.
3. Prompt prefers `ngươi/ta/chính là ngươi` when the scene is hostile, distant, power-asymmetric, historical/fantasy, or otherwise lacks evidence for polite modern address.
4. Single-segment fallback prompt contains the same rule.
5. Workspace default prompt contains the same rule.
6. Focused tests, version guard, build, and diff check pass or failures are documented.

## 5. Technical Plan

1. Update `src/lib/multilingual-audio/transcript-translation.ts` chunk prompt and fallback single-segment prompt.
2. Update `src/features/workspace/workspace-canvas-panel.tsx` default translation prompt copy.
3. Add/update focused prompt tests in transcript translation and Workspace canvas panel tests.
4. Bump patch version, update changelog, run focused tests plus required checks.

## 6. Code Change Impact

- Co thay doi code khong: Yes
- Neu Yes, module impacted:
  - `src/lib/multilingual-audio/transcript-translation.ts`
  - `src/lib/multilingual-audio/transcript-translation.test.ts`
  - `src/features/workspace/workspace-canvas-panel.tsx`
  - `src/features/workspace/workspace-canvas-panel.test.ts`

## 7. Test Plan

1. Focused command:
   - `npm run test -- --run src/lib/multilingual-audio/transcript-translation.test.ts src/features/workspace/workspace-canvas-panel.test.ts`
2. Required checks:
   - `npm run guard:version`
   - `npm run build`
   - `git diff --check`

## 8. Observability

- Translation provider request logs already capture prompt/body request previews; no new runtime telemetry needed.

## 9. Risks & Rollback

- Risk: `ngươi/ta` can sound too archaic for modern romance scenes if over-applied.
- Mitigation: scope the rule to short bare pronoun lines and hostile/distant/power-asymmetric/historical/fantasy context or missing polite-address evidence.
- Rollback strategy: revert prompt/test/changelog/version changes for this task.

## 10. Deliverables

1. Runtime translation prompt update.
2. Workspace default prompt alignment.
3. Prompt regression tests and release metadata.

## 11. Changelog Note

- Tom tat dong changelog du kien: Tighten VIP translation prompt for short direct-dialogue pronouns so `你/我/就是你` can stay `ngươi/ta/chính là ngươi` when context is confrontational or ambiguous.

## 12. Task Type Checklist (Stamp [x])

### 12.1 Feature

- [ ] Co user/system flow ro rang
- [ ] Co acceptance criteria do duoc
- [ ] Co test cho happy path
- [ ] Co test cho failure path chinh

### 12.2 Bugfix

- [x] Co mo ta cach tai hien loi
- [x] Co root cause ngan gon
- [x] Co regression test
- [x] Co xac nhan loi cu khong tai dien

### 12.3 Research

- [ ] Co cau hoi nghien cuu ro
- [ ] Co ket qua/khuyen nghi cu the

## 13. Execution Notes

- Updated runtime VIP translation prompts to treat short bare direct-address lines such as `你`, `我`, `对`, and `就是你` as context-sensitive instead of defaulting to gendered/polite Vietnamese pronouns.
- Added the same guard to the single-segment fallback translation prompt and the Workspace default prompt.
- Added prompt regression coverage for the runtime chunk prompt, fallback prompt, and Workspace prompt text.

## 14. Test Evidence (Mandatory if code changed)

- `npm run test -- --run src/lib/multilingual-audio/transcript-translation.test.ts src/features/workspace/workspace-canvas-panel.test.ts` pass (2 files / 46 tests).
- `npm run guard:version` pass.
- `npm run build` pass.
- `git diff --check` pass.
