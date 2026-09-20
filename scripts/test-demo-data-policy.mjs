import assert from "node:assert/strict";
import { demoOnly, isDemoDataEnabled } from "../src/services/demoDataPolicy.js";

const fixture = { id: "demo" };
const productionFallback = [];

assert.equal(typeof isDemoDataEnabled, "boolean");
assert.deepEqual(demoOnly(fixture, productionFallback), isDemoDataEnabled ? fixture : productionFallback);
assert.deepEqual(demoOnly(undefined, productionFallback), isDemoDataEnabled ? undefined : productionFallback);

console.log("Demo data policy: PASS");
