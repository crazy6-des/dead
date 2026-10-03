import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(new URL("../src/services/apiClient.js", import.meta.url), "utf8");

assert.match(source, /DEFAULT_PRODUCTION_API_BASE_URL\s*=\s*"https:\/\/muddy-tooth-e4be\.binancecompany274\.workers\.dev"/);
assert.match(source, /import\.meta\.env\?\.PROD/);
assert.match(source, /import\.meta\.env\?\.VITE_API_BASE_URL \?\? \(import\.meta\.env\?\.PROD \? \"\" : DEFAULT_PRODUCTION_API_BASE_URL\)/);
assert.match(source, /VITE_API_BASE_URL/);

const netlify = fs.readFileSync(new URL("../netlify.toml", import.meta.url), "utf8");
assert.match(netlify, /VITE_API_BASE_URL\s*=\s*""/);
assert.match(netlify, /from = "\/api\/\*"[\s\S]*?to = "https:\/\/muddy-tooth-e4be\.binancecompany274\.workers\.dev\/api\/:splat"[\s\S]*?status = 200/);

console.log("PASS same-origin production API proxy contract");
