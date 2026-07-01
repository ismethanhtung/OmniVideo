# [FAST-AUDIO-079] Harden Vietnamese Gender Pronoun Translation

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

- Task ID: FAST-AUDIO-079
- Phase: FAST
- Target Phase: Workspace VIP Translation
- Domain: Multilingual Audio / Transcript Translation
- Task Type: Bugfix
- Priority: P0
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

- Owner reports Vietnamese translation sometimes misgenders characters, e.g. calling a male character `nàng` or a female character `hắn`.
- Owner often produces romance/short-drama videos for female viewers, so translation should not default to a male-viewer lens.
- Current prompts mention gender cues, but the guide schema and chunk prompt do not force a concrete gender audit before output.

## 3. Scope

- In scope:
  - Strengthen the automatic transcript translation prompt for character gender consistency.
  - Strengthen the guide preflight schema so it carries gender evidence, aliases, and recommended Vietnamese references.
  - Add neutral/female-audience-friendly style guidance without changing source meaning.
  - Align the Workspace manual import prompt with the same gender/audience rules.
  - Add regression tests for prompt content.
- Out of scope:
  - UI for selecting audience mode.
  - Post-editing already generated translations.
  - Changing transcript segmentation, TTS timing, or provider selection.

## 4. Acceptance Criteria

1. Translation guide prompt asks for character aliases, gender, evidence, and preferred/forbidden Vietnamese references.
2. Chunk translation prompt explicitly audits each segment for gender pronoun mismatches before returning JSON.
3. Prompts instruct the model not to assume the viewer is male and to use neutral/female-audience-friendly recap tone when the source allows it.
4. Ambiguous referents should prefer name/title/neutral phrasing over guessing `hắn`, `nàng`, `anh ấy`, or `cô ấy`.
5. Workspace manual import prompt contains the same core gender/audience rules.
6. Focused tests, version guard, build, and diff check pass or failures are documented.

## 5. Technical Plan

1. Update transcript translation prompt version and gender/audience prompt text.
2. Update guide preflight schema/instructions to capture aliases, gender evidence, preferred refs, and forbidden refs.
3. Update single-segment fallback and Workspace manual import prompt with the same rules.
4. Add/update focused prompt regression tests.
5. Bump patch version, update changelog/board evidence, and verify.

## 6. Code Change Impact

- Co thay doi code khong: Yes
- Neu Yes, module impacted:
  - `src/lib/multilingual-audio/transcript-translation.ts`
  - `src/lib/multilingual-audio/transcript-translation.test.ts`
  - `src/features/workspace/workspace-canvas-panel.tsx`
  - `src/features/workspace/workspace-canvas-panel.test.ts`
  - release metadata

## 7. Test Plan

1. Focused commands:
   - `npm run test -- --run src/lib/multilingual-audio/transcript-translation.test.ts src/features/workspace/workspace-canvas-panel.test.ts`
2. Required checks:
   - `npm run guard:version`
   - `npm run build`
   - `git diff --check`

## 8. Observability

- Translation logs should show the new prompt version via existing `promptVersion` logging.
- No new runtime events are required.

## 9. Risks & Rollback

- Risks: Stronger prompt text can slightly increase prompt tokens and cannot guarantee perfect gender resolution when source context is genuinely ambiguous.
- Rollback strategy: revert this task's prompt/test/release metadata changes.

## 10. Deliverables

1. Hardened gender/audience translation prompts.
2. Prompt regression tests.
3. Version/changelog/task evidence.

## 11. Changelog Note

- Tom tat dong changelog du kien: Harden Vietnamese transcript translation prompts against gender pronoun mistakes and male-viewer bias.

## 12. Task Type Checklist (Stamp [x])

### 12.1 Bugfix

- [x] Co mo ta cach tai hien loi
- [x] Co root cause ngan gon
- [x] Co regression test
- [x] Co xac nhan loi cu khong tai dien

### 12.2 Feature

- [ ] Co user/system flow ro rang
- [ ] Co acceptance criteria do duoc
- [ ] Co test cho happy path
- [ ] Co test cho failure path chinh

### 12.3 Research

- [ ] Co cau hoi nghien cuu ro
- [ ] Co ket qua/khuyen nghi cu the

## 13. Execution Notes

- Implementation:
  - Updated translation prompt version to `transcript-translation-v5-gender-audience-guard` so provider prompt caches do not reuse the older gender rules.
  - Strengthened automatic chunk translation with a cast/gender contract, expanded Chinese gender cues, a Vietnamese pronoun policy, and a silent pre-output gender audit.
  - Strengthened guide preflight schema with aliases, gender evidence, preferred references, forbidden references, relationships, and neutral-to-female-audience-friendly style.
  - Updated single-segment fallback and Workspace manual translation import prompt with the same core gender/audience rules.
  - Bumped app version to `0.11.49` and updated changelog.
- Verification:
  - `npm run test -- --run src/lib/multilingual-audio/transcript-translation.test.ts src/features/workspace/workspace-canvas-panel.test.ts` pass (2 files / 46 tests).
  - `npm run guard:version` pass.
  - `npm run build` pass.
  - `git diff --check` pass.
- Residual risk:
  - Prompting cannot guarantee perfect gender resolution when source context is truly ambiguous or transcript has wrong pronouns. In ambiguous cases, the prompt now prefers neutral wording instead of guessing.
