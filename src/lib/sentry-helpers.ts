import * as Sentry from "@sentry/nextjs";

type LogCategory = "payment" | "booking" | "discount" | "auth" | "system";

function inferCategory(route: string): LogCategory {
  if (route.includes("payment") || route.includes("webhook")) return "payment";
  if (route.includes("book") || route.includes("booking")) return "booking";
  if (route.includes("discount")) return "discount";
  if (route.includes("auth")) return "auth";
  return "system";
}

export function captureApiError(
  route: string,
  error: unknown,
  context?: Record<string, unknown>,
): void {
  Sentry.captureException(error, {
    tags: { route, category: inferCategory(route) },
    extra: context,
  });
}
