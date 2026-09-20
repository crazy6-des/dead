import assert from "node:assert/strict";

const { apiRequest, ApiError } = await import("../src/services/apiClient.js");

function mockResponse({ status = 200, payload = null, contentType = "application/json" } = {}) {
  return new Response(contentType === "application/json" ? JSON.stringify(payload) : String(payload ?? ""), {
    status,
    headers: { "content-type": contentType },
  });
}

const originalFetch = globalThis.fetch;

try {
  globalThis.fetch = async (url, options) => {
    assert.equal(url, "/api/test");
    assert.equal(options.method, "POST");
    assert.equal(options.credentials, "include");
    assert.equal(options.headers.get("Content-Type"), "application/json");
    return mockResponse({ payload: { ok: true } });
  };

  const success = await apiRequest("/api/test", { method: "POST", body: { hello: "world" } });
  assert.deepEqual(success, { ok: true });
  console.log("PASS successful JSON request");

  globalThis.fetch = async () => mockResponse({
    status: 422,
    payload: { message: "Invalid input", code: "VALIDATION_ERROR" },
  });

  await assert.rejects(
    () => apiRequest("/api/test"),
    (error) => error instanceof ApiError
      && error.status === 422
      && error.code === "VALIDATION_ERROR"
      && error.message === "Invalid input",
  );
  console.log("PASS structured API error");

  globalThis.fetch = async () => {
    throw new TypeError("connection failed");
  };

  await assert.rejects(
    () => apiRequest("/api/test"),
    (error) => error instanceof ApiError && error.code === "NETWORK_ERROR",
  );
  console.log("PASS network error normalization");

  globalThis.fetch = (_url, options) => new Promise((_, reject) => {
    options.signal.addEventListener("abort", () => {
      const error = new Error("aborted");
      error.name = "AbortError";
      reject(error);
    }, { once: true });
  });

  await assert.rejects(
    () => apiRequest("/api/test", { timeoutMs: 5 }),
    (error) => error instanceof ApiError && error.code === "REQUEST_ABORTED",
  );
  console.log("PASS timeout normalization");
} finally {
  globalThis.fetch = originalFetch;
}

console.log("API client tests completed.");
