import type { NextRequest } from "next/server";
import { AuthConfigurationError } from "@/lib/auth/errors";
import { getAuth0 } from "@/lib/auth0";
import { errorResponse } from "@/lib/http/json";

export async function withProtectedRoute(request: NextRequest, action: () => Promise<Response>): Promise<Response> {
  try {
    const auth0 = getAuth0();
    const handler = auth0.withApiAuthRequired(async function protectedRoute() {
      return action();
    });
    return (await handler(request, { params: Promise.resolve({}) })) as Response;
  } catch (error) {
    if (error instanceof AuthConfigurationError) {
      return errorResponse(503, "auth_not_configured", error.message);
    }
    throw error;
  }
}
