import assert from "node:assert/strict";
import { APP_ROUTES, isRouteActive, normalizeRoute } from "../src/app/routes.js";

assert.equal(normalizeRoute("/"), APP_ROUTES.HOME);
assert.equal(normalizeRoute("/profile"), APP_ROUTES.PROFILE);
assert.equal(normalizeRoute("/settings?section=profile"), APP_ROUTES.SETTINGS);
assert.equal(normalizeRoute("/settings/profile#security"), "/settings/profile");
assert.equal(normalizeRoute("/post/123?view=replies"), "/post/123");
assert.equal(normalizeRoute("/user/david"), "/user/david");
assert.equal(normalizeRoute("/topic/music/"), "/topic/music");
assert.equal(normalizeRoute("/unknown-route"), APP_ROUTES.HOME);
assert.equal(normalizeRoute(""), APP_ROUTES.HOME);

assert.equal(isRouteActive("/settings/profile", APP_ROUTES.SETTINGS), true);
assert.equal(isRouteActive("/settings", APP_ROUTES.SETTINGS), true);
assert.equal(isRouteActive("/settings/profile", APP_ROUTES.PROFILE), false);
assert.equal(isRouteActive("/discover", APP_ROUTES.HOME), false);
assert.equal(isRouteActive("/post/123", "/post"), true);
assert.equal(isRouteActive("/settings-extra", APP_ROUTES.SETTINGS), false);

console.log("Route contract checks passed.");
