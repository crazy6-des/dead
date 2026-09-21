import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const migrationsDirectory = new URL("../migrations/", import.meta.url);
const entries = (await readdir(migrationsDirectory)).filter((name) => name.endsWith(".sql")).sort();
const versions = new Map();
const failures = [];

for (const name of entries) {
  const match = /^(\d+)_/.exec(name);
  if (!match) {
    failures.push(`Migration has no numeric prefix: ${name}`);
    continue;
  }
  const version = Number(match[1]);
  const previous = versions.get(version);
  if (previous) failures.push(`Duplicate migration version ${String(version).padStart(4, "0")}: ${previous}, ${name}`);
  versions.set(version, name);
  const source = await readFile(join(migrationsDirectory.pathname, name), "utf8");
  if (!source.trim()) failures.push(`Migration is empty: ${name}`);
}

const orderedVersions = [...versions.keys()].sort((a, b) => a - b);
for (let index = 1; index < orderedVersions.length; index += 1) {
  if (orderedVersions[index] === orderedVersions[index - 1]) failures.push(`Repeated migration version: ${orderedVersions[index]}`);
}

if (failures.length) {
  console.error(failures.map((failure) => `FAIL ${failure}`).join("\n"));
  process.exitCode = 1;
} else {
  console.log(`PASS migration filenames: ${entries.length} unique versions`);
}
