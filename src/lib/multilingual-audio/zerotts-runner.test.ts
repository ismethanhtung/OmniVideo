import { execFileSync } from "node:child_process";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";

import { getZeroTtsRunnerScriptPath, resolvePythonExecutable } from "./zerotts";

/**
 * ONNX Runtime 1.22+ rejects graphs whose external data resolves outside the
 * model file's directory. The Hugging Face cache is built out of symlinks into
 * `blobs/`, so a ZeroTTS snapshot trips that validation. The runner therefore
 * materializes the snapshot into a real (hardlinked) directory.
 *
 * These tests drive the Python helpers directly against a synthetic
 * Hugging-Face-style cache, so they need no network and no model download.
 */

const pythonBin = resolvePythonExecutable();
const runnerPath = getZeroTtsRunnerScriptPath();

const pythonAvailable = (() => {
  try {
    execFileSync(pythonBin, ["-c", "print('ok')"], { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
})();

const HELPER_SCRIPT = String.raw`
import importlib.util, json, os, sys

spec = importlib.util.spec_from_file_location("zerotts_runner", sys.argv[1])
module = importlib.util.module_from_spec(spec)
assert spec.loader is not None
spec.loader.exec_module(module)

target = module.materialize_model_dir(sys.argv[2], sys.argv[3])
resolved = module.resolve_local_model_dir(sys.argv[2])

print(json.dumps({"target": str(target), "resolved": str(resolved)}))
`;

const tempRoots: string[] = [];

function makeTempDir(prefix: string): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), prefix));
  tempRoots.push(dir);
  return dir;
}

/**
 * Builds the layout the Hugging Face hub cache uses:
 *   hub/blobs/<sha>        -> ../../blobs/<prefix>/<sha>   (blob symlink)
 *   hub/snapshots/rev/...  -> ../../../blobs/<sha>         (snapshot symlink)
 * The model graph and its `.data` file land in *different* blob folders,
 * which is exactly what ONNX Runtime refuses to load.
 */
function createSymlinkedModelFixture(): string {
  const hub = path.join(makeTempDir("zerotts-hf-"), "hub");
  const blobs = path.join(hub, "blobs");
  const snapshot = path.join(hub, "snapshots", "rev1");

  mkdirSync(path.join(blobs, "aa"), { recursive: true });
  mkdirSync(path.join(blobs, "bb"), { recursive: true });
  mkdirSync(path.join(blobs, "cc"), { recursive: true });
  mkdirSync(path.join(snapshot, "onnx", "codec"), { recursive: true });

  const graphSha = "aa0123456789abcdef";
  const dataSha = "bbfedcba9876543210";
  writeFileSync(path.join(blobs, "aa", graphSha), "GRAPH-BYTES");
  writeFileSync(path.join(blobs, "bb", dataSha), "DATA-BYTES");
  writeFileSync(path.join(blobs, "cc", "voice.npz"), "VOICE-BYTES");

  symlinkSync(path.join("aa", graphSha), path.join(blobs, graphSha));
  symlinkSync(path.join("bb", dataSha), path.join(blobs, dataSha));

  // A directory symlink (hand-made model dirs do this; the hub cache does not).
  symlinkSync(path.join("..", "..", "blobs", "cc"), path.join(snapshot, "voices"));

  symlinkSync(
    path.join("..", "..", "..", "..", "blobs", graphSha),
    path.join(snapshot, "onnx", "codec", "moss_decode.onnx"),
  );
  symlinkSync(
    path.join("..", "..", "..", "..", "blobs", dataSha),
    path.join(snapshot, "onnx", "codec", "moss_decode_shared.data"),
  );
  writeFileSync(path.join(snapshot, "config.json"), '{"num_codebooks": 4}');

  return snapshot;
}

function runHelper(sourceDir: string, targetDir: string, cacheDir: string) {
  const stdout = execFileSync(
    pythonBin,
    ["-c", HELPER_SCRIPT, runnerPath, sourceDir, targetDir],
    {
      encoding: "utf8",
      env: { ...process.env, ZEROTTS_MODEL_CACHE_DIR: cacheDir },
    },
  );
  return JSON.parse(stdout.trim().split("\n").pop() as string) as {
    target: string;
    resolved: string;
  };
}

afterAll(() => {
  for (const dir of tempRoots) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe.skipIf(!pythonAvailable)("ZeroTTS runner model materialization", () => {
  it("converts a symlinked Hugging Face snapshot into real files", () => {
    const source = createSymlinkedModelFixture();
    const target = path.join(makeTempDir("zerotts-materialized-"), "model");
    const cacheDir = makeTempDir("zerotts-cache-");

    const result = runHelper(source, target, cacheDir);

    expect(result.target).toBe(target);
    expect(existsSync(path.join(target, ".omnivideo-model.json"))).toBe(true);

    for (const relative of [
      path.join("onnx", "codec", "moss_decode.onnx"),
      path.join("onnx", "codec", "moss_decode_shared.data"),
    ]) {
      const file = path.join(target, relative);
      expect(existsSync(file)).toBe(true);
      expect(lstatSync(file).isSymbolicLink()).toBe(false);
    }

    expect(readFileSync(path.join(target, "onnx", "codec", "moss_decode.onnx"), "utf8")).toBe(
      "GRAPH-BYTES",
    );
    expect(
      readFileSync(path.join(target, "onnx", "codec", "moss_decode_shared.data"), "utf8"),
    ).toBe("DATA-BYTES");
    expect(readFileSync(path.join(target, "config.json"), "utf8")).toBe('{"num_codebooks": 4}');

    // A symlinked *directory* must be materialized in full, not dropped.
    const voicesFile = path.join(target, "voices", "voice.npz");
    expect(existsSync(voicesFile)).toBe(true);
    expect(lstatSync(voicesFile).isSymbolicLink()).toBe(false);
    expect(readFileSync(voicesFile, "utf8")).toBe("VOICE-BYTES");
  });

  it("creates a hardlink instead of duplicating model bytes when possible", () => {
    const source = createSymlinkedModelFixture();
    const target = path.join(makeTempDir("zerotts-materialized-"), "model");
    const cacheDir = makeTempDir("zerotts-cache-");

    runHelper(source, target, cacheDir);

    const sourceStat = lstatSync(path.join(source, "onnx", "codec", "moss_decode.onnx"));
    const targetStat = lstatSync(path.join(target, "onnx", "codec", "moss_decode.onnx"));
    // The materialized copy must share the blob inode (hardlink), not carry a
    // second copy of the model bytes.
    const blobStat = lstatSync(
      path.join(source, "..", "..", "blobs", "aa", "aa0123456789abcdef"),
    );
    expect(sourceStat.isSymbolicLink()).toBe(true);
    expect(targetStat.isSymbolicLink()).toBe(false);
    expect(targetStat.ino).toBe(blobStat.ino);
  });

  it("reuses a complete materialized directory without rewriting it", () => {
    const source = createSymlinkedModelFixture();
    const target = path.join(makeTempDir("zerotts-materialized-"), "model");
    const cacheDir = makeTempDir("zerotts-cache-");

    runHelper(source, target, cacheDir);
    const firstInode = lstatSync(path.join(target, "onnx", "codec", "moss_decode.onnx")).ino;

    const second = runHelper(source, target, cacheDir);
    const secondInode = lstatSync(path.join(target, "onnx", "codec", "moss_decode.onnx")).ino;

    expect(second.target).toBe(target);
    expect(secondInode).toBe(firstInode);
  });

  it("returns a symlink-free model directory untouched and caches symlinked ones", () => {
    const source = createSymlinkedModelFixture();
    const localDir = path.join(makeTempDir("zerotts-local-"), "model");
    mkdirSync(path.join(localDir, "onnx"), { recursive: true });
    writeFileSync(path.join(localDir, "config.json"), "{}");
    writeFileSync(path.join(localDir, "onnx", "text_encoder.onnx"), "GRAPH");

    const direct = runHelper(
      localDir,
      path.join(makeTempDir("zerotts-materialized-"), "model"),
      makeTempDir("zerotts-cache-"),
    );
    expect(direct.resolved).toBe(realpathSync(localDir));

    const cacheDir = makeTempDir("zerotts-cache-");
    const cached = runHelper(source, path.join(makeTempDir("zerotts-materialized-"), "model"), cacheDir);
    expect(cached.resolved.startsWith(realpathSync(cacheDir))).toBe(true);
    expect(lstatSync(cached.resolved).isDirectory()).toBe(true);
  });
});
