import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const app = await readFile(new URL("../src/App.jsx", import.meta.url), "utf8");
const wrapper = await readFile(new URL("../src/features/auth/AuthLanding.jsx", import.meta.url), "utf8");

assert.match(app, /<AuthLanding auth=\{auth\} onAuthenticated=\{enterApp\}\/>/,
  "App must pass the shared auth controller into its non-authenticated fallback");
assert.match(wrapper, /function AuthLanding\(\{ auth, onAuthenticated \}\)/,
  "AuthLanding must accept the shared auth controller");
assert.match(wrapper, /<LandingRoute[^>]*auth=\{auth\}[^>]*onAuthenticated=\{onAuthenticated\}/,
  "AuthLanding must forward the shared auth controller to the canonical sign-in form");

console.log("PASS fallback login uses shared auth state; successful sign-in can transition App out of landing");
