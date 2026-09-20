import assert from "node:assert/strict";
import { APP_ROUTES } from "../src/app/routes.js";
import { PRIMARY_NAVIGATION, MOBILE_NAVIGATION } from "../src/app/navigation.js";

assert.equal(PRIMARY_NAVIGATION[0].route, APP_ROUTES.HOME);
assert.equal(PRIMARY_NAVIGATION.at(-1).route, APP_ROUTES.EARN);
assert.equal(new Set(PRIMARY_NAVIGATION.filter((item) => item.route).map((item) => item.route)).size, PRIMARY_NAVIGATION.length);
assert.equal(MOBILE_NAVIGATION.length, 5);
assert.equal(MOBILE_NAVIGATION[2].label, "Create");
assert.equal(MOBILE_NAVIGATION[2].route, null);

console.log("Navigation contract checks passed.");
