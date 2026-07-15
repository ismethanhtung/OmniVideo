# [FAST-AUDIO-082] Select Local Piper Voice Models in Feature Sandbox

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

- Task ID: FAST-AUDIO-082
- Phase: FAST
- Target Phase: Feature Sandbox
- Domain: Multilingual Audio / Piper TTS
- Task Type: Feature
- Priority: P1
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

Feature Sandbox Voice Lab currently requires manual entry of Piper ONNX model and config JSON paths. The repository can contain multiple local Piper model pairs under `piper/`, so the operator needs a quick model selector for repeated voice testing.

## 3. Scope

- In scope:
  - Discover direct `.onnx` files in the repository `piper/` directory only when a matching `.onnx.json` config exists.
  - Expose the discovered model/config pairs through a read-only API.
  - Add a Voice model selector that fills the existing ONNX model and Config JSON fields automatically.
  - Preserve manual path entry and the existing Run Piper TTS flow.
- Out of scope:
  - Downloading/installing Piper models.
  - Recursive scans outside `piper/`.
  - Changing Workspace/VIP model selection defaults.

## 4. Acceptance Criteria

1. With `piper/model.onnx` and `piper/model.onnx.json`, Voice Lab shows a selectable `model` option.
2. Every selectable option has both a readable ONNX model path and matching config JSON path; orphan `.onnx` files are omitted.
3. Selecting an option updates the existing model/config settings without manual typing and the existing Run Piper TTS request uses those selected paths.
4. When no complete local model pair exists or discovery fails, Voice Lab stays usable with manual fields and shows a clear empty-state message.
5. Focused tests cover complete-pair discovery and omitted orphan/failure cases, plus selector wiring.

## 5. Technical Plan

1. Add a small server-only Piper model catalog helper constrained to the repository `piper/` directory.
2. Add a Node runtime GET endpoint returning complete model/config pairs.
3. Fetch the catalog in Feature Sandbox and bind a selector to the existing paths while retaining manual overrides.
4. Add focused tests, bump patch version, run required checks, and record evidence.

## 6. Test Plan

1. Unit: catalog returns sorted complete pairs and excludes an ONNX model without matching JSON.
2. Failure: missing/unreadable catalog directory returns an empty list without crashing.
3. UI regression: panel source test verifies catalog fetch, empty state, and selection path wiring.
4. Required checks: focused tests, `npm run guard:version`, `npm run build`, and `git diff --check`.

## 7. Observability

- Discovery failures intentionally degrade to an empty selector response so manual fields continue to work; no sensitive filesystem details are exposed to the browser.

## 8. Risks & Rollback

- Risk: a malformed or incomplete local model can otherwise appear selectable.
- Mitigation: only list direct `.onnx` files with exact sibling `.onnx.json` files.
- Rollback: revert the catalog helper, API/UI selector, tests, task metadata, changelog entry, and patch version bump.

## 9. Deliverables

1. Local Piper model catalog helper and API.
2. Voice Lab model selector with usable empty state.
3. Tests and task/changelog evidence.

## 10. Changelog Note

- Planned summary: Add automatic local Piper model selection to Feature Sandbox Voice Lab.

## 11. Execution Notes

- Assumption: “không cần phải nhập text vào” refers to no longer typing model/config paths manually; the existing synthesis text box remains required by Piper and retains its default test phrase.

## 12. Test Evidence (Mandatory if code changed)

- `npm run test -- --run src/lib/multilingual-audio/piper-model-catalog.test.ts src/features/audio/piper-tts-sandbox-panel.test.ts` pass (2 files / 7 tests).
- `npm run guard:version` pass.
- `npm run build` pass outside the filesystem sandbox; the in-sandbox attempt was blocked by Turbopack needing to bind an internal port, not by code/type errors.
- `git diff --check` pass.
- Residual risk: discovery intentionally only refreshes on opening/reloading Feature Sandbox; after adding a file to `piper/`, reload the page to see it.
