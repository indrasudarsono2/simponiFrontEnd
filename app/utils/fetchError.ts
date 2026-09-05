export function getFetchErrorMessage(error: unknown, fallback: string): string {
  if (!error || typeof error !== "object") return fallback;

  const value = error as {
    data?: { message?: unknown };
    statusMessage?: unknown;
    message?: unknown;
  };
  const message = value.data?.message ?? value.statusMessage ?? value.message;
  return typeof message === "string" && message.trim() ? message : fallback;
}
