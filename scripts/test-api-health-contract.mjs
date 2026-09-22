import assert from "node:assert/strict";
import fs from "node:fs";
import { API_HEALTH_PATH } from "../src/services/apiHealth.js";

const source = fs.readFileSync(new URL("../src/services/apiHealth.js", import.meta.url), "utf8");

assert.equal(API_HEALTH_PATH, "/api/health");
assert.match(source, /hasApiBaseUrl/);
assert.match(source, /apiClient\.get\(API_HEALTH_PATH/);
assert.match(source, /reachable: payload\?\.ok === true/);
assert.match(source, /configured: false/);

console.log("PASS frontend API health boundary");
