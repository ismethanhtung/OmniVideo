import type { InspirationVaultItem } from "./inspiration-vault";

type ApiListResponse =
    | {
          ok: true;
          data: InspirationVaultItem[];
      }
    | {
          ok: false;
          error?: string;
          errorCode?: string;
      };

type ApiItemResponse =
    | {
          ok: true;
          data: InspirationVaultItem;
      }
    | {
          ok: false;
          error?: string;
          errorCode?: string;
      };

type ApiDeleteResponse =
    | {
          ok: true;
          data: { deleted: true };
      }
    | {
          ok: false;
          error?: string;
          errorCode?: string;
      };

function buildApiError(payload: { error?: string; errorCode?: string }) {
    return new Error(payload.error ?? payload.errorCode ?? "Request failed.");
}

export async function listInspirationVaultItemsFromApi() {
    const response = await fetch("/api/inspiration-vault", {
        method: "GET",
        cache: "no-store",
    });
    const payload = (await response.json()) as ApiListResponse;

    if (!payload.ok) {
        throw buildApiError(payload);
    }
    if (!response.ok) {
        throw new Error("Request failed.");
    }

    return payload.data;
}

export async function createInspirationVaultItemFromApi(rawInput: string) {
    const response = await fetch("/api/inspiration-vault", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ rawInput }),
    });
    const payload = (await response.json()) as ApiItemResponse;

    if (!payload.ok) {
        throw buildApiError(payload);
    }
    if (!response.ok) {
        throw new Error("Request failed.");
    }

    return payload.data;
}

export async function updateInspirationVaultItemFromApi(
    itemId: string,
    exploited: boolean,
) {
    const response = await fetch(
        `/api/inspiration-vault/${encodeURIComponent(itemId)}`,
        {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ exploited }),
        },
    );
    const payload = (await response.json()) as ApiItemResponse;

    if (!payload.ok) {
        throw buildApiError(payload);
    }
    if (!response.ok) {
        throw new Error("Request failed.");
    }

    return payload.data;
}

export async function deleteInspirationVaultItemFromApi(itemId: string) {
    const response = await fetch(
        `/api/inspiration-vault/${encodeURIComponent(itemId)}`,
        {
            method: "DELETE",
        },
    );
    const payload = (await response.json()) as ApiDeleteResponse;

    if (!payload.ok) {
        throw buildApiError(payload);
    }
    if (!response.ok) {
        throw new Error("Request failed.");
    }

    return payload.data;
}
