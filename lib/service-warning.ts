export const SERVICE_WARNING_EVENT = "target-lab-service-warning";

export type ServiceWarning = {
  title: string;
  detail: string;
};

function warningFor(response: Response): ServiceWarning | null {
  if (response.status === 429) {
    return { title: "Too many requests", detail: "The service is limiting requests right now. Please wait a moment, then try again." };
  }
  if (response.status >= 500 && response.status <= 599) {
    return { title: "Service temporarily unavailable", detail: "Your request could not be completed. Please try again shortly." };
  }
  return null;
}

export async function apiFetch(input: string, init?: RequestInit): Promise<Response> {
  const response = await fetch(input, init);
  const warning = warningFor(response);
  if (warning && typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent<ServiceWarning>(SERVICE_WARNING_EVENT, { detail: warning }));
  }
  return response;
}
