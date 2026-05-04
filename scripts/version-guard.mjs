#!/usr/bin/env node

import { execSync } from "node:child_process";

function run(command) {
  return execSync(command, { encoding: "utf8" }).trim();
}

function tryRun(command) {
  try {
    return run(command);
  } catch {
    return "";
  }
}

function hasAnyPrefix(path, prefixes) {
  return prefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

const explicitBase = process.env.VERSION_GUARD_BASE?.trim();
const fallbackBase = tryRun("git merge-base HEAD origin/main");
const baseRef = explicitBase || fallbackBase || "HEAD~1";

const changedRaw = tryRun(`git diff --name-only ${baseRef}`);
if (!changedRaw) {
  console.log(`[version-guard] No changes detected against ${baseRef}.`);
  process.exit(0);
}

const changedFiles = changedRaw
  .split("\n")
  .map((line) => line.trim())
  .filter(Boolean);

const runtimePrefixes = ["src", "app", "components", "lib", "pages"];
const runtimeFiles = changedFiles.filter(
  (file) =>
    hasAnyPrefix(file, runtimePrefixes) ||
    file.startsWith("next.config.") ||
    file.startsWith("middleware."),
);

if (runtimeFiles.length === 0) {
  console.log("[version-guard] No runtime changes found. Version bump not required.");
  process.exit(0);
}

const requiredFiles = ["package.json", "package-lock.json", "changelog/changelog.md"];
const missing = requiredFiles.filter((file) => !changedFiles.includes(file));

if (missing.length > 0) {
  console.error("[version-guard] Runtime changes detected without required release files.");
  console.error(`[version-guard] Base ref: ${baseRef}`);
  console.error("[version-guard] Runtime changed files:");
  for (const file of runtimeFiles) {
    console.error(`- ${file}`);
  }
  console.error("[version-guard] Missing required updates:");
  for (const file of missing) {
    console.error(`- ${file}`);
  }
  console.error(
    "[version-guard] Fix: bump version (npm version patch|minor|major --no-git-tag-version) and update changelog.",
  );
  process.exit(1);
}

console.log("[version-guard] OK: runtime changes include version + lockfile + changelog updates.");
