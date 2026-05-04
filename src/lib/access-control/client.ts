import type { AppAccessState } from "./access-control";

export async function fetchAppAccessState(): Promise<AppAccessState> {
  const response = await fetch("/api/app/access", {
    method: "GET",
    cache: "no-store",
  });
  const payload = (await response.json()) as
    | {
        ok: true;
        data: AppAccessState;
      }
    | {
        ok: false;
        error?: string;
      };

  if (!response.ok || !payload.ok) {
    throw new Error(
      "error" in payload && payload.error
        ? payload.error
        : "Unable to load app access state.",
    );
  }

  return payload.data;
}
