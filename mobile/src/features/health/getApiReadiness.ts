import { environment } from "@/src/config/environment";

interface HealthResponse {
  status: string;
}

export const getApiReadiness = async (): Promise<void> => {
  const response = await fetch(`${environment.apiOrigin}/health/ready`, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Health request failed with status ${response.status}`);
  }

  const payload = (await response.json()) as HealthResponse;

  if (payload.status !== "ok") {
    throw new Error("API is not ready");
  }
};
