const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: JSON_HEADERS,
  });
}

function routeNotFound() {
  return json({
    error: {
      code: "NOT_FOUND",
      status: 404,
      message: "Route not found.",
    },
  }, 404);
}

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204 });
    }

    if (request.method === "GET" && url.pathname === "/health") {
      return json({ ok: true, service: "sss-api", version: "0.1.0" });
    }

    if (request.method === "GET" && url.pathname === "/api/health") {
      return json({ ok: true, service: "sss-api", version: "0.1.0" });
    }

    return routeNotFound();
  },
};
