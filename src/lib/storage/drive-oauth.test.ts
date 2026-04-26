import { afterEach, describe, expect, it, vi } from "vitest";

import {
  buildDriveAuthorizationUrl,
  getDriveOAuthConfig,
  getDriveOAuthOrigin,
  getMissingDriveOAuthConfig,
} from "./drive-oauth";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("drive oauth", () => {
  it("detects missing client config", () => {
    vi.stubEnv("DRIVE_CLIENT_ID", "");
    vi.stubEnv("DRIVE_CLIENT_SECRET", "");

    expect(getMissingDriveOAuthConfig()).toEqual([
      "DRIVE_CLIENT_ID",
      "DRIVE_CLIENT_SECRET",
    ]);
  });

  it("builds redirect uri using STORAGE_OAUTH_BASE_URL", () => {
    vi.stubEnv("STORAGE_OAUTH_BASE_URL", "http://localhost:3001");
    vi.stubEnv("DRIVE_CLIENT_ID", "drive-client");
    vi.stubEnv("DRIVE_CLIENT_SECRET", "drive-secret");
    const config = getDriveOAuthConfig();

    expect(config.redirectUri).toBe(
      "http://localhost:3001/api/storage/oauth/callback/drive",
    );
  });

  it("builds Google auth URL with drive.file scope", () => {
    vi.stubEnv("STORAGE_OAUTH_BASE_URL", "http://localhost:3001");
    vi.stubEnv("DRIVE_CLIENT_ID", "drive-client");
    vi.stubEnv("DRIVE_CLIENT_SECRET", "drive-secret");
    const url = new URL(buildDriveAuthorizationUrl("state-123"));

    expect(url.origin).toBe("https://accounts.google.com");
    expect(url.searchParams.get("client_id")).toBe("drive-client");
    expect(url.searchParams.get("state")).toBe("state-123");
    expect(url.searchParams.get("scope")).toContain(
      "https://www.googleapis.com/auth/drive.file",
    );
  });

  it("returns origin from oauth base url", () => {
    vi.stubEnv("STORAGE_OAUTH_BASE_URL", "https://omni.example.com");
    vi.stubEnv("DRIVE_CLIENT_ID", "drive-client");
    vi.stubEnv("DRIVE_CLIENT_SECRET", "drive-secret");

    expect(getDriveOAuthOrigin()).toBe("https://omni.example.com");
  });

  it("prefers provided base url over env values", () => {
    vi.stubEnv("STORAGE_OAUTH_BASE_URL", "https://from-env.example.com");
    vi.stubEnv("DRIVE_CLIENT_ID", "drive-client");
    vi.stubEnv("DRIVE_CLIENT_SECRET", "drive-secret");

    const config = getDriveOAuthConfig("https://from-request.example.com");
    expect(config.redirectUri).toBe(
      "https://from-request.example.com/api/storage/oauth/callback/drive",
    );
    expect(getDriveOAuthOrigin("https://from-request.example.com")).toBe(
      "https://from-request.example.com",
    );
  });
});
