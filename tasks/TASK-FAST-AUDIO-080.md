# [FAST-AUDIO-080] Soften Gender Guardrails for Contextual Vietnamese Address Terms

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

- Task ID: FAST-AUDIO-080
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

- Owner reviewed the new gender prompt and flagged a risk: hard gender guardrails can over-force romance pronouns such as `chàng`.
- Example: an angry female lead saying `ngươi làm gì thế` to the male lead should not be softened into `chàng làm gì thế` before the relationship/tone supports it.
- The prompt must help the AI avoid gender mistakes without overriding scene context, relationship stage, power dynamics, anger, distance, or direct address style.

## 3. Scope

- In scope:
  - Make gender rules explicitly advisory/supportive rather than a forced pronoun mapping.
  - Add relationship-stage and direct-dialogue address rules.
  - Prevent `chàng/nàng` from being used just because gender is known.
  - Align automatic translation, guide preflight, fallback, and Workspace manual prompt.
  - Update prompt regression tests.
- Out of scope:
  - New UI for choosing address style.
  - Post-processing generated translations.
  - Changing provider/model/runtime flow.

## 4. Acceptance Criteria

1. Prompts say gender map supports consistency but does not override source wording, relationship stage, or emotion.
2. Prompts explicitly warn that `chàng/nàng` are not default gender pronouns and require romantic/literary context or established intimacy.
3. Direct dialogue keeps source address style when angry/distant/formal, allowing `ngươi`, `anh`, `cô`, name/title, or neutral wording as context requires.
4. Guide schema captures relationship stage and address style notes.
5. Workspace manual import prompt mirrors the same soft guardrails.
6. Focused tests, version guard, build, and diff check pass or failures are documented.

## 5. Technical Plan

1. Update translation prompt version and soften automatic gender/address wording.
2. Extend guide preflight schema with relationship stage and address style notes.
3. Update single-segment fallback and Workspace manual import prompt with contextual address rules.
4. Update focused prompt tests.
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

- Existing translation logs include prompt version.

## 9. Risks & Rollback

- Risks: Contextual address terms still depend on model judgment when transcript context is thin.
- Rollback strategy: revert this task's prompt/test/release metadata changes.

## 10. Deliverables

1. Softer contextual gender/address prompts.
2. Prompt regression tests.
3. Version/changelog/task evidence.

## 11. Changelog Note

- Tom tat dong changelog du kien: Refine Vietnamese gender guardrails so address terms stay contextual instead of forcing romance pronouns.

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
  - Updated translation prompt version to `transcript-translation-v6-contextual-address-guard`.
  - Reframed gender mapping as supporting evidence instead of a forced pronoun mapping.
  - Added contextual address rules: `chàng/nàng` require intimate/literary/romantic context and should not replace sharper direct address in angry, distant, hostile, formal, or pre-romance dialogue.
  - Extended guide preflight schema with `relationshipStage` and `addressStyle`.
  - Updated single-segment fallback and Workspace manual import prompt with the same contextual address rules.
  - Bumped app version to `0.11.50` and updated changelog.
- Verification:
  - `npm run test -- --run src/lib/multilingual-audio/transcript-translation.test.ts src/features/workspace/workspace-canvas-panel.test.ts` pass (2 files / 46 tests).
  - `npm run guard:version` pass.
  - `npm run build` pass.
  - `git diff --check` pass.
- Residual risk:
  - Address-term quality still depends on enough nearby context. The prompt now tells the model to preserve source address force or use neutral wording rather than forcing romance pronouns.
