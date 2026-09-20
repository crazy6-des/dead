const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
};

function corsHeaders(request, env) {
  const origin = request.headers.get("Origin");
  const allowedOrigin = env?.FRONTEND_ORIGIN;
  const headers = new Headers(JSON_HEADERS);

  if (origin && allowedOrigin && origin === allowedOrigin) {
    headers.set("access-control-allow-origin", origin);
    headers.set("access-control-allow-credentials", "true");
    headers.set("vary", "Origin");
  }

  return headers;
}

function json(data, status = 200, request, env) {
  return new Response(JSON.stringify(data), {
    status,
    headers: corsHeaders(request, env),
  });
}

function errorResponse(code, status, message, request, env, details) {
  return json({
    error: {
      code,
      status,
      message,
      ...(details === undefined ? {} : { details }),
    },
  }, status, request, env);
}

function routeNotFound(request, env) {
  return errorResponse("NOT_FOUND", 404, "Route not found.", request, env);
}

function methodNotAllowed(request, env) {
  return errorResponse("METHOD_NOT_ALLOWED", 405, "Method not allowed.", request, env);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      const headers = corsHeaders(request, env);
      headers.set("access-control-allow-methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
      headers.set("access-control-allow-headers", "content-type, authorization, x-request-id");
      return new Response(null, { status: 204, headers });
    }

    if (url.pathname === "/health" || url.pathname === "/api/health") {
      if (request.method !== "GET") return methodNotAllowed(request, env);
      return json({ ok: true, service: "sss-api", version: "0.1.0" }, 200, request, env);
    }

    return routeNotFound(request, env);
  },
};
