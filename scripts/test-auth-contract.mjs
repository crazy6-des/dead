import assert from "node:assert/strict";
import {
  AUTH_MODES,
  AUTH_STATUSES,
  createAuthRequest,
  createAuthState,
  getAuthUser,
  isAuthenticated,
} from "../src/features/auth/authContract.js";

assert.deepEqual(AUTH_MODES, {
  SIGN_IN: "sign-in",
  SIGN_UP: "sign-up",
  SIGN_OUT: "sign-out",
  RECOVER: "recover",
  RESET: "reset",
});

assert.deepEqual(AUTH_STATUSES, {
  UNKNOWN: "unknown",
  LOADING: "loading",
  AUTHENTICATED: "authenticated",
  ANONYMOUS: "anonymous",
  ERROR: "error",
});

const request = createAuthRequest({
  mode: AUTH_MODES.SIGN_IN,
  email: "  USER@Example.COM ",
  password: "secret",
});

assert.equal(request.mode, AUTH_MODES.SIGN_IN);
assert.equal(request.email, "user@example.com");
assert.equal(request.password, "secret");
assert.equal(Object.isFrozen(request), true);

assert.deepEqual(getAuthUser({ user: { id: "user-1" } }), { id: "user-1" });
assert.deepEqual(getAuthUser({ data: { user: { id: "user-2" } } }), { id: "user-2" });
assert.equal(getAuthUser({ data: {} }), null);

const anonymous = createAuthState();
assert.equal(anonymous.status, AUTH_STATUSES.UNKNOWN);
assert.equal(anonymous.user, null);
assert.equal(anonymous.error, null);
assert.equal(isAuthenticated(anonymous), false);

const authenticated = createAuthState(
  AUTH_STATUSES.AUTHENTICATED,
  { id: "user-1" },
);
assert.equal(isAuthenticated(authenticated), true);
assert.equal(Object.isFrozen(authenticated), true);

const authenticatedWithoutUser = createAuthState(
  AUTH_STATUSES.AUTHENTICATED,
  null,
);
assert.equal(isAuthenticated(authenticatedWithoutUser), false);

const errorState = createAuthState(
  AUTH_STATUSES.ERROR,
  null,
  new Error("failed"),
);
assert.equal(errorState.status, AUTH_STATUSES.ERROR);
assert.equal(errorState.error.message, "failed");

console.log("PASS canonical auth vocabulary");
