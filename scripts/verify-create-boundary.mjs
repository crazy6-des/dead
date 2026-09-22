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

if (!appSource.includes('import { CreateRoute } from "./features/create/index.js";')) {
  throw new Error("Verification failed: App.jsx must use the canonical CreateRoute integration.");
}

if (!appSource.includes("<CreateRoute onPublish={publish} onCancel={() => setCreating(false)}/>")) {
  throw new Error("Verification failed: App.jsx must render CreateRoute for the create surface.");
}

if (appSource.includes("function Create({publish,close})")) {
  throw new Error("Verification failed: obsolete legacy Create component is still present in App.jsx.");
}

const composerSource = fs.readFileSync(new URL("../src/features/create/CreateComposer.jsx", import.meta.url), "utf8");
for (const marker of [`type="submit"`, "onSubmit={handleSubmit}", "Nothing posts until you press Publish"]) {
  if (!composerSource.includes(marker)) throw new Error("Verification failed: Create must require explicit Publish.");
}
for (const marker of ["text, image, music, background", "Add image", "Choose local music", "Choose background"]) {
  if (!composerSource.includes(marker)) throw new Error("Verification failed: Create is missing independent content controls.");
}
console.log("PASS Create requires explicit Publish and supports independent content controls.");
console.log("PASS App.jsx uses the canonical CreateRoute surface.");
console.log("Create boundary verification completed.");
