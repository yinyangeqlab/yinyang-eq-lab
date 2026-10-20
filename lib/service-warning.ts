export const SERVICE_WARNING_EVENT = "target-lab-service-warning";
export type ServiceWarning = { title: string; detail: string; retry: string | null; kind?: "rate-limit" | "maintenance" | "unavailable" };

export function warningFor(response: Response, path = ""): ServiceWarning | null {
  if (response.status === 429) {
    const header = response.headers.get("Retry-After");
    const seconds = header && /^\d+$/.test(header) ? Number(header) : header ? Math.ceil((Date.parse(header) - Date.now()) / 1000) : NaN;
    const retry = Number.isFinite(seconds) && seconds > 0
      ? seconds < 60 ? `Please try again in about ${Math.ceil(seconds)} seconds.`
        : seconds < 3600 ? `Please come back in about ${Math.ceil(seconds / 60)} minute${Math.ceil(seconds / 60) === 1 ? "" : "s"}.`
        : `Please come back in about ${Math.ceil(seconds / 3600)} hour${Math.ceil(seconds / 3600) === 1 ? "" : "s"}.`
      : "Please take a break and come back again later.";
    const audio=path.includes('/api/listening-audio/')||path.startsWith('/music/');
    const signIn=['/access','/admin-login','/owner-login'].includes(path);
    const reason=audio?'Audio requests are temporarily rate limited. Please pause seeking and wait before pressing Play again.':signIn?'Sign-in attempts are temporarily rate limited. Please wait before trying again.':'Requests are temporarily rate limited to protect the site. This request wasn’t accepted.';
    return { kind:"rate-limit", title: "Thanks for listening!", detail: reason+" Your earlier saved results are still available.", retry };
  }
  if(response.status===503&&response.headers.get("X-YinYang-Service")==="maintenance")return {kind:"maintenance",title:"Maintenance in progress",detail:"This feature is temporarily unavailable during maintenance. Your saved data is preserved. Please use another available tool.",retry:"Please return after the maintenance notice clears."};
  if (response.status >= 500 && response.status <= 599) {
    return { kind:"unavailable", title: "Service temporarily unavailable", detail: "Your request could not be completed. Please try again shortly.", retry: null };
  }
  return null;
}

export async function apiFetch(input: string, init?: RequestInit): Promise<Response> {
  return fetch(input, init);
}
