# FAST-WORKSPACE-012 Workspace Audio Functional Parity and Video Preprocess Node

## 0. Progress Stamp

- [x] DoR checklist completed
- [x] Scope locked
- [x] Implementation completed
- [x] Tests added/updated (if code changed)
- [x] Version guard passed (if runtime changed)
- [x] Docs updated (if impacted)
- [x] Changelog updated
- [x] Ready for review
- [ ] Done

## 1. Metadata

- Task ID: FAST-WORKSPACE-012
- Phase: FAST
- Target Phase: Workspace runtime parity
- Domain: Workspace / Multilingual Audio / Video Pipeline
- Task Type: Feature
- Priority: P0
- Size: M
- Owner: AI Agent
- Reviewer: Owner
- Status: Review

## 2. Context

- Lý do: Workspace audio/video nodes vẫn lệch so với flow tốt của trang Audio Transcript và chưa có `Video Preprocess` node chạy thật.
- Bài toán cần giải quyết: nâng Workspace lên functional parity thay vì chỉ thêm node hình thức, sao cho planner/runtime thực sự chạy được với asset/artifact/video preprocess path.
- Tài liệu liên quan:
  - `docs/architecture/node-architecture.md`
  - `docs/domains/multilingual-audio.md`
  - `docs/domains/video-pipeline.md`

## 3. Scope

- In scope:
  - Audit và đồng bộ các chênh lệch ảnh hưởng khả năng chạy/chất lượng giữa Audio Transcript và Workspace.
  - Cho `audio.chinese-transcribe` nhận storage asset và generated video artifact hợp lệ.
  - Reuse word-aware timing preparation cho Workspace voice generation và composite dubbing path.
  - Expose thêm Piper controls `noiseScale`, `noiseW`, `sentenceSilence`.
  - Thêm node `video.preprocess` executable, planner/runtime wiring, seed flow mẫu và tests.
- Out of scope:
  - Full UI parity với Audio Transcript workbench.
  - Thay đổi default Workspace alignment mode khỏi `balanced`.
  - Persist pipeline definitions sang MongoDB.

## 4. Input / Output

- Input: Workspace graph chứa source file/url/asset hoặc generated video artifact.
- Output mong đợi: graph có thể preprocess video rồi đi tiếp sang transcript/dubbing/edit/storage với behavior tương thích runtime hiện tại.

## 5. Acceptance Criteria

1. `audio.chinese-transcribe` chạy được từ `source.asset` và video artifact hợp lệ, không chỉ `source.file`/`source.url`.
2. Workspace voice generation và video dubbing dùng cùng helper chuẩn bị segment theo word timing hiện tại khi có dữ liệu word timestamp.
3. `audio.voice-generation` và `audio.video-dubbing` expose và forward `noiseScale`, `noiseW`, `sentenceSilence`.
4. Node `video.preprocess` có contract rõ, xuất hiện trong catalog, có step planner/runtime thật và output nối được sang transcript/dubbing/mirror/edit/storage.
5. Có seed flow mẫu dùng preprocess và tests bao phủ happy/failure paths chính.
6. Docs liên quan phản ánh capability mới và targeted verification pass.

## 6. Technical Plan

1. Tổng quát hóa upstream media resolution để dùng chung cho source file/url/asset/generated artifact.
2. Mở rộng node templates, planner, runtime executor và inspector configs cho preprocess + parity gaps.
3. Reuse word-aware timing helper trong Workspace/dubbing, thêm seed/tests/docs/changelog/version evidence.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted:
  - `src/lib/workspace/workspace-graph.ts`
  - `src/lib/workspace/workspace-graph.test.ts`
  - `src/lib/workspace/workspace-seeds.ts`
  - `src/lib/workspace/workspace-seeds.test.ts`
  - `src/features/workspace/workspace-canvas-panel.tsx`
  - `src/lib/multilingual-audio/video-dubbing.ts`
  - `src/lib/multilingual-audio/video-dubbing.test.ts`
  - `docs/architecture/node-architecture.md`
  - `docs/domains/multilingual-audio.md`
  - `docs/domains/video-pipeline.md`

## 8. Test Plan

1. Unit/planner tests:
   - `npm run test -- --run src/lib/workspace/workspace-graph.test.ts src/lib/workspace/workspace-seeds.test.ts`
2. Runtime/audio tests:
   - `npm run test -- --run src/lib/multilingual-audio/video-dubbing.test.ts src/lib/multilingual-audio/voice-segment-timing.test.ts src/features/audio/chinese-transcription-panel.test.ts`
3. Failure cases:
   - preprocess node thiếu upstream;
   - fan-in không hợp lệ;
   - transcription node thiếu media producer hợp lệ.
4. Release verify:
   - `npm run build`
   - `npm run guard:version`

## 9. Observability

- Metrics: reuse generation/preprocess timing hiện có; preserve artifact detail summaries.
- Logs: giữ hành vi hiện tại.
- Error codes: reuse preprocess/dubbing/transcription codes hiện có.

## 10. Risks & Rollback

- Risks:
  - Tổng quát hóa media producer có thể làm planner rộng hơn và dễ tạo đường đi không hợp lệ nếu validation thiếu.
  - Composite dubbing dùng timing helper mới có thể thay đổi timing output nếu transcript có word timestamps bất thường.
- Rollback strategy:
  - Revert node/template/runtime additions and fall back to source-specific paths cũ.

## 11. Deliverables

1. Executable `video.preprocess` Workspace node.
2. Media-resolution path dùng chung cho source/asset/artifact.
3. Functional parity upgrades cho audio nodes.
4. Seed/tests/docs/changelog/version evidence.

## 12. Changelog Note

- Add executable Workspace Video Preprocess node and bring audio nodes to functional parity with reusable media/timing paths.

## 13. Task Type Checklist (Stamp [x])

### 13.1 Feature

- [x] Có user/system flow rõ ràng
- [x] Có acceptance criteria đo được
- [x] Có test cho happy path
- [x] Có test cho failure path chính

## 14. Execution Notes

- Assumptions:
  - `balanced` vẫn là default phù hợp cho Workspace; parity tập trung vào khả năng chạy và quality-critical preparation.
  - Release batch này dùng chung minor bump với `FAST-AUDIO-052`.
- Blockers: none.
- Verification evidence:
  - Workspace graph now includes executable `video.preprocess` planning/runtime/Inspector support and a new preprocess seed.
  - `audio.chinese-transcribe` accepts Storage Asset and preprocess artifact upstream.
  - Workspace voice and dubbing paths now reuse word-aware timing preparation and expose extended Piper controls.
  - Browser verification confirmed Workspace surfaces `Video Preprocess` and `Seed Asset Preprocess Dubbing`.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/lib/workspace/workspace-graph.test.ts`
  - `src/lib/workspace/workspace-seeds.test.ts`
  - `src/lib/multilingual-audio/video-dubbing.test.ts`
- Test commands executed:
  - `npm run test -- --run src/features/audio/chinese-transcription-panel.test.ts src/lib/workspace/workspace-graph.test.ts src/lib/workspace/workspace-seeds.test.ts src/lib/multilingual-audio/video-dubbing.test.ts src/lib/multilingual-audio/voice-segment-timing.test.ts`
  - `npm run build`
  - `npm run guard:version`
- Test results summary:
  - Targeted audio/workspace suite pass (`5 files`, `58 tests`).
  - Production build pass after rerun outside sandbox because Turbopack's sandboxed PostCSS worker attempted a restricted port bind.
  - Version guard pass (`[version-guard] OK`).
