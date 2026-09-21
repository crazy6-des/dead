import assert from "node:assert/strict";
import { APP_ROUTES } from "../src/app/routes.js";
import {
  HEADER_NAVIGATION,
  MOBILE_NAVIGATION,
  PRIMARY_NAVIGATION,
  SECONDARY_NAVIGATION,
} from "../src/app/navigation.js";

const hasIconComponent = (item) => item.icon != null;

assert.equal(PRIMARY_NAVIGATION[0].route, APP_ROUTES.HOME);
assert.equal(PRIMARY_NAVIGATION.at(-1).route, APP_ROUTES.EARN);
assert.equal(new Set(PRIMARY_NAVIGATION.map((item) => item.route)).size, PRIMARY_NAVIGATION.length);
assert.ok(PRIMARY_NAVIGATION.every(hasIconComponent));

assert.deepEqual(
  HEADER_NAVIGATION.map((item) => item.route),
  [APP_ROUTES.NOTIFICATIONS, APP_ROUTES.PROFILE],
);
assert.ok(HEADER_NAVIGATION.every(hasIconComponent));

assert.equal(MOBILE_NAVIGATION.length, 5);
assert.equal(MOBILE_NAVIGATION[2].label, "Create");
assert.equal(MOBILE_NAVIGATION[2].route, null);
assert.equal(MOBILE_NAVIGATION[3].route, APP_ROUTES.MESSAGES);
assert.equal(MOBILE_NAVIGATION[4].route, APP_ROUTES.EARN);
assert.ok(MOBILE_NAVIGATION.filter((item) => item.route).every(hasIconComponent));

assert.deepEqual(
  SECONDARY_NAVIGATION.map((item) => item.route),
  [APP_ROUTES.SPACES, APP_ROUTES.SAVED, APP_ROUTES.LISTS, APP_ROUTES.SETTINGS],
);
assert.ok(SECONDARY_NAVIGATION.every(hasIconComponent));

console.log("Navigation contract checks passed.");
