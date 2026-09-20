import assert from "node:assert/strict";
import worker from "../src/index.js";

const response = await worker.fetch(new Request("https://example.test/api/health"));
assert.equal(response.status, 200);
assert.deepEqual(await response.json(), {
  ok: true,
  service: "sss-api",
  version: "0.1.0",
});

const missing = await worker.fetch(new Request("https://example.test/api/missing"));
assert.equal(missing.status, 404);
assert.equal((await missing.json()).error.code, "NOT_FOUND");

console.log("Worker health contract: PASS");
