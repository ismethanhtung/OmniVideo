# [FAST-VIDEO-067] Preserve Composer Render Quality and Vietnamese Text Fidelity

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

- Task ID: FAST-VIDEO-067
- Phase: FAST
- Target Phase: Video Composer
- Domain: Video Processing / FFmpeg Render
- Task Type: Bugfix
- Priority: P0
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

Owner reports quality loss in the rendered MP4, text smaller than local preview without line breaks, and Vietnamese glyphs rendered as missing-character boxes. Current renderer uses CRF 20, an unverified display font, and raw UI font sizes/coordinates rather than source-video dimensions.

## 3. Scope

- In scope: lossless video encoding settings, high-bitrate mixed audio, Unicode-capable font selection, newline preservation, source-dimension-aware text sizing, and preview-matching centered position math.
- Out of scope: separate font-upload UI or non-Latin typography customization beyond Unicode-safe fallback.

## 4. Acceptance Criteria

1. Final video encoding uses lossless CRF 0, not CRF 20.
2. Vietnamese text uses an available Unicode font file instead of the decorative display font when rendering server-side.
3. Multi-line text preserves newline breaks in FFmpeg drawtext.
4. Server text size is scaled from the 896×504 preview canvas to actual source height and uses the same center-anchor coordinate semantics as preview.
5. Tests cover lossless quality, Unicode font, wrapping, and scaled/centered text expressions.

## 5. Technical Plan

1. Probe first source clip dimensions using FFmpeg output.
2. Build Unicode-safe drawtext arguments and map preview font pixels/position to source pixels.
3. Switch MP4 video encode to CRF 0 and audio mix encode to 320 kbps AAC.
4. Update tests/release metadata and verify build.

## 6. Test Plan

1. Runtime test checks lossless CRF, Unicode font path resolver, newline escaping, source-height scaling and center positioning.
2. Existing composer route/panel focused tests.
3. Required guard, build, and diff checks.

## 7. Observability

- Render errors continue to return the FFmpeg error string through the existing Composer UI.

## 8. Risks & Rollback

- Risk: CRF 0 creates much larger MP4s and takes longer.
- Mitigation: quality is explicitly prioritized by owner; use a medium encoding preset rather than lower quality.
- Rollback: revert the encoder/font/scaling changes.

## 9. Deliverables

1. Lossless composer output.
2. Unicode-safe Vietnamese multi-line text matching preview geometry.
3. Tests and release evidence.

## 10. Changelog Note

- Planned summary: Preserve Video Composer output quality and render Vietnamese text faithfully.

## 11. Execution Notes

- Decorative preview fonts may not contain Vietnamese glyphs. Server rendering therefore prioritizes a Unicode-capable font file over an unavailable decorative glyph set.

## 12. Test Evidence (Mandatory if code changed)

- `npm run test -- --run src/lib/video-processing/video-composer-render.test.ts src/features/video-processing/video-composer-panel.test.ts src/app/api/video-processing/composer-render/route.test.ts` pass (3 files / 8 tests).
- `npm run guard:version` pass.
- `npm run build` pass outside the filesystem sandbox because Turbopack requires an internal port.
- `git diff --check` pass.
- Residual risk: CRF 0 output is substantially larger and slower to render by design; it is the selected tradeoff to prioritize quality.
