export const SERVICE_WARNING_EVENT = "target-lab-service-warning";
export type ServiceWarning = { title: string; detail: string; retry: string | null };

export function warningFor(response: Response): ServiceWarning | null {
  if (response.status === 429) {
    const header = response.headers.get("Retry-After");
    const seconds = header && /^\d+$/.test(header) ? Number(header) : header ? Math.ceil((Date.parse(header) - Date.now()) / 1000) : NaN;
    const retry = Number.isFinite(seconds) && seconds > 0
      ? seconds < 60 ? `Please try again in about ${Math.ceil(seconds)} seconds.`
        : seconds < 3600 ? `Please come back in about ${Math.ceil(seconds / 60)} minute${Math.ceil(seconds / 60) === 1 ? "" : "s"}.`
        : `Please come back in about ${Math.ceil(seconds / 3600)} hour${Math.ceil(seconds / 3600) === 1 ? "" : "s"}.`
      : "Please take a break and come back again later.";
    return { title: "Thanks for listening!", detail: "You’ve reached a temporary submission limit. This request wasn’t accepted. Your earlier saved results are still available.", retry };
  }
  if (response.status >= 500 && response.status <= 599) {
    return { title: "Service temporarily unavailable", detail: "Your request could not be completed. Please try again shortly.", retry: null };
  }
  return null;
}

export async function apiFetch(input: string, init?: RequestInit): Promise<Response> {
  return fetch(input, init);
}
