import fs from "node:fs";

const appPath = new URL("../src/App.jsx", import.meta.url);
const source = fs.readFileSync(appPath, "utf8");

const legacyMarker = 'function Create({publish,close})';
const integrationMarker = 'CreateModalAdapter';

if (!source.includes(legacyMarker)) {
  throw new Error("Migration stopped: legacy Create component was not found.");
}

if (source.includes(integrationMarker)) {
  throw new Error("Migration stopped: CreateModalAdapter already appears in App.jsx.");
}

const importNeedle = 'import{';
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

fs.writeFileSync(appPath, updated);
console.log("Added CreateModalAdapter import. Component replacement remains intentionally manual and must be reviewed before commit.");
