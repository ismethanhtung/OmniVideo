# [FAST-AUDIO-090] Fix ZeroTTS ONNX External-Data Validation Failure on Hugging Face Cache

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

- Task ID: FAST-AUDIO-090
- Phase: FAST
- Target Phase: Feature Sandbox
- Domain: Multilingual Audio / ZeroTTS runtime
- Task Type: Bugfix
- Priority: P1
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

Synthesizing in the ZeroTTS Voice Lab failed for every request with:

```
[ONNXRuntimeError] : 1 : FAIL : External data path validation failed for initializer:
model.quantizer.output_proj.bias. Error: External data path escapes model directory.
External data path: "moss_audio_tokenizer_decode_shared.data"
resolved path: ".../.cache/huggingface/hub/blobs/02/021d..."
allowed directory: ".../.cache/huggingface/hub/blobs/6a"
```

Root cause: the packaged `huggingface_hub` cache stores every snapshot file as a symlink into
`blobs/` (`snapshots/<rev>/onnx/codec/* -> ../../../blobs/<xx>/<sha>`). ONNX Runtime 1.22+
(installed: 1.30.0) canonicalizes the graph path and then rejects external-data tensors that
resolve outside that directory. The codec graph and its `.data` file live in two different blob
folders, so the MOSS codec decoder could never be created — the model itself is fine.

## 3. Scope

- In scope:
  - `src/lib/multilingual-audio/zerotts-runner.py`: resolve the model into a symlink-free local
    directory (hardlinks to the cached blobs, so no extra disk usage) before handing it to
    `ZeroTTS.from_pretrained`.
  - Idempotent materialization with a `.omnivideo-model.json` marker; reuse when complete.
  - Local, already symlink-free model dirs are used as-is.
  - New tests for the materialization helpers.
- Out of scope:
  - Pinning/downgrading `onnxruntime` (the validation is a security feature worth keeping).
  - Changing model download patterns or voice-clone behavior.

## 4. Input / Output

- Input: `--model-id zeroweight-ai/ZeroTTS` (repo id) or a local model directory.
- Output: ONNX sessions load; synthesis returns a valid WAV; cache lives at
  `~/.cache/omnivideo/zerotts-models/<name>-<hash>/` (override: `ZEROTTS_MODEL_CACHE_DIR`).

## 5. Acceptance Criteria

1. `--action synthesize` no longer raises `External data path validation failed`.
2. The materialized model dir contains regular files (no symlinks) and shares inodes with the
   Hugging Face blobs (no duplicate model bytes).
3. Repeated runs reuse the materialized dir (same inode, no rewrite).
4. A symlink-free local model directory is returned untouched.
5. Existing ZeroTTS tests pass and version guard succeeds.

## 6. Technical Plan

1. Add `get_model_cache_root`, `find_symlinked_entries`, `_iter_model_files`, `_link_or_copy`,
   `materialize_model_dir` and `resolve_local_model_dir` to the runner.
2. Call `resolve_local_model_dir(model_id)` inside `get_or_create_tts` and load from that path.
3. Add `src/lib/multilingual-audio/zerotts-runner.test.ts` driving the helpers against a synthetic
   Hugging-Face-style symlink cache.
4. Bump version and update changelog.

## 7. Verification Evidence

- Reproduction before fix: `zerotts-runner.py --action synthesize --text "Xin chào..."` →
  `External data path validation failed for initializer: model.quantizer.output_proj.bias`.
- After fix: same command returns `{"ok": true, ...}` with a valid 184,364-byte WAV; daemon
  (`--action server`) `/health` + `/synthesize` also OK.
- `npx vitest run src/lib/multilingual-audio/zerotts-runner.test.ts` → 4 passed.
- `npx vitest run src/lib/multilingual-audio/zerotts.test.ts` → 7 passed.
- `npm run guard:version` → pass after patch bump `0.11.86 -> 0.11.87`.

## 8. Residual Risk

- Materialization falls back to a full copy when the cache dir and the Hugging Face cache live on
  different filesystems (hardlink `EXDEV`); that costs one extra ~1GB on first run.
