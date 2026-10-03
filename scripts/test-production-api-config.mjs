import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(new URL("../src/services/apiClient.js", import.meta.url), "utf8");
assert.match(source, /VITE_API_BASE_URL/);

const netlify = fs.readFileSync(new URL("../netlify.toml", import.meta.url), "utf8");
assert.match(netlify, /VITE_API_BASE_URL\s*=\s*"https:\/\/muddy-tooth-e4be\.binancecompany274\.workers\.dev"/);
assert.doesNotMatch(netlify, /from = "\/api\/\*"/);

const worker = fs.readFileSync(new URL("../backend/src/index.js", import.meta.url), "utf8");
assert.match(worker, /PRODUCTION_FRONTEND_ORIGIN = "https:\/\/goldzzs\.netlify\.app"/);
assert.doesNotMatch(worker, /siterx\.netlify\.app/);

const wrangler = fs.readFileSync(new URL("../backend/wrangler.toml", import.meta.url), "utf8");
assert.match(wrangler, /FRONTEND_ORIGIN = "https:\/\/goldzzs\.netlify\.app"/);
assert.doesNotMatch(wrangler, /siterx\.netlify\.app/);

const workflow = fs.readFileSync(new URL("../.github/workflows/deploy-cloudflare.yml", import.meta.url), "utf8");
assert.match(workflow, /TEST_ORIGIN: https:\/\/goldzzs\.netlify\.app/);
assert.doesNotMatch(workflow, /siterx\.netlify\.app/);

console.log("PASS direct production API endpoint contract");
