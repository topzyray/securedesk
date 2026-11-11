import type { NextRequest } from "next/server";
import { createDefaultContext } from "@/lib/api/context";
import { handleGetWeather } from "@/lib/api/handlers";
import { withProtectedRoute } from "@/lib/auth/protect-route";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function GET(request: NextRequest): Promise<Response> {
  return withProtectedRoute(request, () => handleGetWeather(request.headers, createDefaultContext()));
}
