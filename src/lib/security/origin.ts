import { errorResponse } from "@/lib/http/json";

export function clientKey(headers: Headers): string {
  if (process.env.TRUST_PROXY === "true") {
    const forwarded = headers.get("x-forwarded-for");
    if (forwarded) {
      const first = forwarded.split(",")[0]?.trim();
      if (first) return first.slice(0, 128);
    }
    const realIp = headers.get("x-real-ip")?.trim();
    if (realIp) return realIp.slice(0, 128);
  }

  return "untrusted-direct";
}

export function rejectCrossOrigin(requestHeaders: Headers): Response | null {
  const origin = requestHeaders.get("origin");
  if (!origin) return null;

  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    return errorResponse(403, "forbidden", "Cross-origin request rejected.");
  }

  const host = requestHeaders.get("host");
  if (!host || originHost !== host) {
    return errorResponse(403, "forbidden", "Cross-origin request rejected.");
  }

  return null;
}
