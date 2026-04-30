import { mkdirSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const repoRoot = process.cwd();
const pythonBin = process.env.PYTHON_BIN || "python3";
const vendorPythonPath = path.join(repoRoot, ".vendor", "python");

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    stdio: "inherit",
    ...options,
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} exited with ${result.status}`);
  }
}

mkdirSync(vendorPythonPath, { recursive: true });

console.log(`Installing yt-dlp into ${path.relative(repoRoot, vendorPythonPath)}...`);
run(pythonBin, [
  "-m",
  "pip",
  "install",
  "--upgrade",
  "--target",
  vendorPythonPath,
  "yt-dlp",
]);

console.log("Verifying repo-local yt-dlp runtime...");
run(
  pythonBin,
  [
    "-c",
    "import yt_dlp; print(f'yt-dlp {yt_dlp.version.__version__} ready')",
  ],
  {
    env: {
      ...process.env,
      PYTHONPATH: process.env.PYTHONPATH
        ? `${vendorPythonPath}${path.delimiter}${process.env.PYTHONPATH}`
        : vendorPythonPath,
    },
  },
);
