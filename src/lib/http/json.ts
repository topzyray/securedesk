export function json(data: unknown, status = 200, headers?: HeadersInit): Response {
  const responseHeaders = new Headers(headers);
  responseHeaders.set("cache-control", "private, no-store");
  return Response.json(data, { status, headers: responseHeaders });
}

export function errorResponse(status: number, code: string, message: string): Response {
  return json({ error: { code, message } }, status);
}
