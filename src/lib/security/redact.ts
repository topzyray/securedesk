const SENSITIVE_KEY = /authorization|cookie|token|secret|password|api[-_]?key/i;
const BEARER = /Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi;
const JWT = /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g;
const DATABASE_URL = /postgres(?:ql)?:\/\/[^\s'"]+/gi;

export function redactString(value: string): string {
  return value.replace(BEARER, "Bearer [redacted]").replace(JWT, "[redacted-jwt]").replace(DATABASE_URL, "postgres://[redacted]");
}

export function redact(value: unknown): unknown {
  if (typeof value === "string") {
    return redactString(value);
  }

  if (Array.isArray(value)) {
    return value.map((entry) => redact(entry));
  }

  if (value && typeof value === "object") {
    const output: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      output[key] = SENSITIVE_KEY.test(key) ? "[redacted]" : redact(entry);
    }
    return output;
  }

  return value;
}

export function logError(message: string, details?: Record<string, unknown>): void {
  const payload = {
    level: "error",
    message,
    details: details ? redact(details) : undefined,
  };
  console.error(JSON.stringify(payload));
}
