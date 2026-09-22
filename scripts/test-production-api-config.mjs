import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(new URL("../src/services/apiClient.js", import.meta.url), "utf8");

assert.match(source, /DEFAULT_PRODUCTION_API_BASE_URL\s*=\s*"https:\/\/muddy-tooth-e4be\.binancecompany274\.workers\.dev"/);
assert.match(source, /import\.meta\.env\?\.PROD/);
assert.match(source, /VITE_API_BASE_URL/);

console.log("PASS production API fallback contract");
