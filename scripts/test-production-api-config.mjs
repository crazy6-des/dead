import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(new URL("../src/services/apiClient.js", import.meta.url), "utf8");

assert.match(source, /const API_BASE_URL = String\(import\.meta\.env\?\.VITE_API_BASE_URL \?\? ""\)/);
assert.match(source, /Boolean\(API_BASE_URL\) \|\| Boolean\(import\.meta\.env\?\.PROD\)/);
assert.match(source, /VITE_API_BASE_URL/);

const netlify = fs.readFileSync(new URL("../netlify.toml", import.meta.url), "utf8");
assert.match(netlify, /VITE_API_BASE_URL\s*=\s*"https:\/\/muddy-tooth-e4be\.binancecompany274\.workers\.dev"/);
assert.doesNotMatch(netlify, /from = "\/api\/\*"/);

console.log("PASS direct production API endpoint contract");
