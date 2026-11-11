import type { NextRequest } from "next/server";
import { createDefaultContext } from "@/lib/api/context";
import { handleGetPreferences, handlePatchPreferences } from "@/lib/api/handlers";
import { withProtectedRoute } from "@/lib/auth/protect-route";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function GET(request: NextRequest): Promise<Response> {
  return withProtectedRoute(request, () => handleGetPreferences(request.headers, createDefaultContext()));
}

export function PATCH(request: NextRequest): Promise<Response> {
  return withProtectedRoute(request, () => handlePatchPreferences(request, createDefaultContext()));
}
