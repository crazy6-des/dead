import fs from "node:fs";

const checks = [
  ["src/features/create/CreateComposer.jsx", ["validatePostDraft", "onPublish", "onCancel"]],
  ["src/features/create/CreateRoute.jsx", ["createCreatePublishHandler", "CreateComposer"]],
  ["src/features/create/CreateModalAdapter.jsx", ["enabled", "fallback", "CreateComposer"]],
  ["src/features/create/createIntegration.js", ["createPostAdapter", "adapter.publish"]],
  ["src/features/create/createFeatureFlag.js", ["VITE_ENABLE_NEW_CREATE_COMPOSER", "isNewCreateComposerEnabled"]],
  ["src/features/create/index.js", ["CreateModalAdapter", "isNewCreateComposerEnabled"]],
];

for (const [file, markers] of checks) {
  const source = fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
  for (const marker of markers) {
    if (!source.includes(marker)) {
      throw new Error(`Verification failed: ${file} is missing ${marker}`);
    }
  }
  console.log(`PASS ${file}`);
}

const appSource = fs.readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
if (!appSource.includes("function Create({publish,close})")) {
  throw new Error("Verification failed: legacy Create component was not found in App.jsx");
}
if (appSource.includes("CreateModalAdapter")) {
  throw new Error("Verification failed: App.jsx already references CreateModalAdapter; review integration state manually.");
}

console.log("PASS App.jsx remains on the legacy Create path; no integration was applied.");
console.log("Create boundary verification completed.");
