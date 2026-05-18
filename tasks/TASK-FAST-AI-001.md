# [FAST-AI-001] Switch Default Translation Provider/Model to 9router

## 0. Progress Stamp
- [x] DoR checklist completed
- [x] Scope locked
- [ ] Implementation completed
- [ ] Tests added/updated (if code changed)
- [ ] Docs updated (if impacted)
- [ ] Changelog updated
- [ ] Ready for review
- [ ] Done

## 1. Metadata
- Task ID: FAST-AI-001
- Phase: FAST
- Target Phase: AI provider defaults
- Domain: Workspace + Audio Transcript
- Task Type: Feature
- Priority: P1
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: In Progress

## 2. Context
- Multiple UI/runtime paths still default to `Default (env GROQ_API_KEY)` with model `llama-3.1-8b-instant`.
- User requested to change only those defaults to provider `9router (openai-compatible)` and model `cx/gpt-5.3-codex-low`, without touching Whisper behavior.

## 3. Scope
- In scope:
  - switch translation/metadata/dubbing default model from `llama-3.1-8b-instant` to `cx/gpt-5.3-codex-low`;
  - switch default provider presentation/fallback from env Groq to `9router (openai-compatible)`;
  - apply in Workspace and Audio Transcript flows that previously used the default Groq path.
- Out of scope:
  - changing Whisper/STT models;
  - changing explicitly user-selected provider/model values.

## 4. Acceptance Criteria
1. All flows previously using empty/default provider + `llama-3.1-8b-instant` now default to `9router (openai-compatible)` + `cx/gpt-5.3-codex-low`.
2. Workspace runtime translation/metadata/dubbing steps resolve default provider to active 9router-compatible provider when node config provider is empty.
3. Audio Transcript translation/metadata requests resolve default provider to active 9router-compatible provider when provider select is empty.
4. Whisper/STT behavior remains unchanged.

## 5. Technical Plan
1. Add reusable helper to resolve default active `9router (openai-compatible)` provider id.
2. Update default translation model constants and Workspace node defaults.
3. Update Workspace and Audio Transcript runtime provider-resolution logic for empty/default provider.
4. Update UI labels/placeholders for the new default and keep fallback safety.

## 6. Test Plan
1. Update affected regression tests for new default model string.
2. Run focused suite:
   - `src/lib/multilingual-audio/transcript-translation.test.ts`
   - `src/features/audio/chinese-transcription-panel.test.ts`
   - `src/lib/workspace/workspace-graph.test.ts`
   - `src/features/workspace/workspace-canvas-panel.test.ts`
3. `npm run build`
4. `npm run guard:version`

## 7. Changelog Note
- Default translation provider/model now resolves to `9router (openai-compatible)` + `cx/gpt-5.3-codex-low` in Workspace and Audio Transcript fallback paths.

## 8. Execution Notes
- Keep provider fallback robust: if active 9router-compatible provider is missing, runtime still falls back to existing behavior.

## 9. Test Evidence
- TBD
