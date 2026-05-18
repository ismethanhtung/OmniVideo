# [FAST-INTAKE-006] Restore Public Bilibili 1080p Intake via HTML5 Fallback

## 0. Progress Stamp
- [x] DoR checklist completed
- [x] Scope locked
- [x] Implementation completed
- [x] Tests added/updated (if code changed)
- [ ] Docs updated (if impacted)
- [x] Changelog updated
- [x] Ready for review
- [ ] Done

## 1. Metadata
- Task ID: FAST-INTAKE-006
- Phase: FAST
- Target Phase: Intake reliability
- Domain: Video Intake / Bilibili resolver
- Task Type: Bug
- Priority: P1
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Review

## 2. Context
- Historical no-cookie Bilibili assets were stored at 1080p with both audio and video, but the current resolver only surfaced 360p/480p DASH formats for the same public URLs.
- Investigation showed Bilibili still exposes a no-cookie `platform=html5&qn=80` progressive path that returns a fetchable 1080p MP4 with both audio and video, while the default DASH path currently omits 720p/1080p video rows.

## 3. Scope
- In scope:
  - add a public Bilibili HTML5 progressive probe for high-quality fallback;
  - expose the recovered HTML5 formats in the resolver format list;
  - prefer the recovered 1080p A/V path for public `best` / `1080p` Bilibili resolves.
- Out of scope:
  - authenticated Bilibili cookie support;
  - unrelated intake providers;
  - redesigning the Video Intake UI.

## 4. Acceptance Criteria
1. Public Bilibili `best` resolve can return a no-cookie 1080p A/V media payload when the HTML5 path exposes quality `80`.
2. Format listing exposes the recovered HTML5 progressive entry and recommends it when it exceeds the default DASH max height.
3. Existing merged-media resolver behavior remains available as fallback for non-Bilibili and lower-quality paths.
4. Regression tests cover the HTML5 selector/payload logic and resolver format ordering.

## 5. Technical Plan
1. Add Bilibili HTML5 helper functions around `platform=html5` progressive responses.
2. Wire HTML5 fallback into `resolve_info` and append discovered HTML5 rows in `list_formats`.
3. Add regression tests and verify with live smoke commands against a historical user URL.

## 6. Test Plan
1. `PYTHONPATH=.vendor/python python3 src/lib/video-intake/internal-resolver-py.test.py`
2. `npm run test -- --run src/lib/video-intake/internal-resolver.test.ts src/app/api/video-intake/formats/route.test.ts src/features/video-intake/video-intake-panel.test.ts src/features/video-intake/video-intake-v2-panel.test.ts`
3. Live smoke:
   - `PYTHONPATH=.vendor/python python3 src/lib/video-intake/internal-resolver.py formats https://www.bilibili.com/video/BV1uG411A7N5/ best`
   - `PYTHONPATH=.vendor/python python3 src/lib/video-intake/internal-resolver.py resolve https://www.bilibili.com/video/BV1uG411A7N5/ best`

## 7. Changelog Note
- Restore public no-cookie Bilibili 1080p intake by adding an HTML5 progressive fallback when the default DASH response omits higher qualities.

## 8. Execution Notes
- DB evidence:
  - `BV1uG411A7N5` stored `1080p`, `formatId=100113+30280`, `hasAudio=true`, `hasVideo=true` on `2026-05-05`.
  - The same URL stored only `480p`, `formatId=100110+30280` on `2026-05-18`.
- Live investigation:
  - default public DASH path currently returns only 360p/480p video rows for `BV1uG411A7N5`;
  - `platform=html5&qn=80` returns a fetchable progressive MP4 at `1920x1080` with both H.264 video and AAC audio, no login required.

## 9. Test Evidence
- Test files added/updated:
  - `src/lib/video-intake/internal-resolver-py.test.py`
- Test commands executed:
  - `PYTHONPATH=.vendor/python python3 src/lib/video-intake/internal-resolver-py.test.py`
  - `npm run test -- --run src/lib/video-intake/internal-resolver.test.ts src/app/api/video-intake/formats/route.test.ts src/features/video-intake/video-intake-panel.test.ts src/features/video-intake/video-intake-v2-panel.test.ts`
  - `npm run build`
  - `npm run guard:version`
  - `git diff --check`
- Test results summary:
  - Python resolver regression tests pass (17 tests).
  - Targeted Vitest resolver/intake suite passes (3 files / 13 tests).
  - `npm run build` passes with the existing ESLint circular-config warning.
  - `npm run guard:version` passes after patch bump `0.9.2 -> 0.9.3`.
  - `git diff --check` passes.
- Live smoke evidence:
  - format listing now includes `bilibili-html5-80` and recommends it for `BV1uG411A7N5`;
  - resolve now returns `formatSelector=bilibili-html5-80`, `height=1080`, `hasAudio=true`, `hasVideo=true`, `downloadMode=direct-url`.
  - the user-reported URL `BV1DA411Y78D` also resolves to `bilibili-html5-80`, `height=1080`, `hasAudio=true`, `hasVideo=true`.
