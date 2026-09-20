import fs from "node:fs";

const appPath = new URL("../src/App.jsx", import.meta.url);
const source = fs.readFileSync(appPath, "utf8");
const shouldApply = process.argv.includes("--apply");

const legacyMarker = "function Create({publish,close})";
const integrationMarker = "CreateModalAdapter";

if (!source.includes(legacyMarker)) {
  throw new Error("Migration stopped: legacy Create component was not found.");
}

if (source.includes(integrationMarker)) {
  throw new Error("Migration stopped: CreateModalAdapter already appears in App.jsx.");
}

const importNeedle = "import{";
const importIndex = source.indexOf(importNeedle);
if (importIndex === -1) {
  throw new Error("Migration stopped: App.jsx import block could not be located.");
}

const firstImportEnd = source.indexOf(";", importIndex);
if (firstImportEnd === -1) {
  throw new Error("Migration stopped: App.jsx import statement could not be located.");
}

const adapterImport = '\nimport CreateModalAdapter from "./features/create/CreateModalAdapter";';
const updated = `${source.slice(0, firstImportEnd + 1)}${adapterImport}${source.slice(firstImportEnd + 1)}`;

if (updated === source) {
  throw new Error("Migration stopped: no change was produced.");
}

if (!shouldApply) {
  console.log("Dry run passed. Re-run with --apply only after reviewing the planned import change.");
  process.exit(0);
}

const backupPath = new URL("../src/App.jsx.create-migration-backup", import.meta.url);
if (fs.existsSync(backupPath)) {
  throw new Error("Migration stopped: backup file already exists.");
}

fs.writeFileSync(backupPath, source);
fs.writeFileSync(appPath, updated);
console.log("Applied adapter import and created a local App.jsx backup. Component replacement remains manual and requires review.");
