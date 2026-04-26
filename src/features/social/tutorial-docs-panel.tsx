"use client";

import { BookOpen, CheckCircle2, ExternalLink } from "lucide-react";

import type { LeftbarNavItem } from "@/components/layout/types";

type TutorialDocsPanelProps = {
  section: LeftbarNavItem;
};

const youtubeSetupSteps = [
  "Open Google Cloud Console.",
  "Search for and enable YouTube Data API v3.",
  "Configure OAuth consent screen.",
  "Create OAuth Client ID with type Web Application.",
  "Copy Client ID and Client Secret into .env as YOUTUBE_CLIENT_ID and YOUTUBE_CLIENT_SECRET.",
  "Set SOCIAL_OAUTH_BASE_URL to the running app base URL, for example http://localhost:3001 or your real domain.",
  "Add the redirect URI shown in Social Accounts to Authorized redirect URIs in the OAuth Client.",
  "Create or edit the YouTube social account, then click Connect OAuth.",
];

const youtubeTroubleshooting = [
  {
    title: "Error 403 access_denied while app is in testing",
    body: "Add your email in APIs & Services > OAuth consent screen > Audience > Test users, then retry OAuth.",
  },
  {
    title: "Connection Test says insufficient scopes",
    body: "Add https://www.googleapis.com/auth/youtube.upload in Google Cloud data access, then reconnect OAuth. Tokens issued before a scope change do not receive the new scope.",
  },
  {
    title: "Upload requested public/unlisted but YouTube keeps it private",
    body: "YouTube may force API uploads from unverified API projects to private until the project passes required review/audit.",
  },
  {
    title: "Shorts upload appears as a normal video",
    body: "YouTube Data API uses the same upload endpoint for Shorts and videos. Shorts classification depends on the uploaded media: square or vertical, and no more than 3 minutes.",
  },
];

const driveSetupSteps = [
  "Open Google Cloud Console.",
  "Enable Google Drive API.",
  "Create OAuth Client ID with type Web Application.",
  "Copy Client ID and Client Secret into .env as DRIVE_CLIENT_ID and DRIVE_CLIENT_SECRET.",
  "Set STORAGE_OAUTH_BASE_URL to your running app URL (for example http://localhost:3001).",
  "Add Authorized redirect URI: {STORAGE_OAUTH_BASE_URL}/api/storage/oauth/callback/drive",
  "Open Storage Providers > New > Google Drive, then click Connect OAuth.",
];

const driveTroubleshooting = [
  {
    title: "Error 400 redirect_uri_mismatch",
    body: "Google OAuth client redirect URI must exactly match the URI shown in Storage Provider modal, including protocol, host, port, and path.",
  },
  {
    title: "OAuth popup opened but token not filled",
    body: "Allow popups for the app domain and retry Connect OAuth.",
  },
  {
    title: "Missing OAuth env vars",
    body: "Set DRIVE_CLIENT_ID and DRIVE_CLIENT_SECRET. Optionally set STORAGE_OAUTH_BASE_URL to the exact running domain.",
  },
  {
    title: "Upload works then fails with invalid authentication credentials",
    body: "Access tokens are short-lived. Keep DRIVE_CLIENT_ID and DRIVE_CLIENT_SECRET configured, then reconnect OAuth so OmniVideo can store refresh_token and auto-refresh at runtime.",
  },
];

const platformCards = [
  {
    title: "Facebook Reels / Video",
    scope: "pages_manage_posts, pages_read_engagement",
    status: "OAuth foundation exists; real publish adapter is deferred.",
    notes: ["Use Page ID for page publishing.", "Do not rely on raw Page tokens as the long-term workflow."],
  },
  {
    title: "TikTok Video",
    scope: "video.upload, video.publish",
    status: "OAuth foundation exists; publish requires API eligibility/app review.",
    notes: ["Manual tokens are for diagnostics only.", "Publish adapter should validate TikTok review and quota responses."],
  },
  {
    title: "Shopee Product Video",
    scope: "shop_authorization, product_write",
    status: "Shop authorization adapter is deferred.",
    notes: ["Shop ID is needed for product/video mapping.", "Publish must validate product ownership and shop permissions."],
  },
];

export function TutorialDocsPanel({ section }: TutorialDocsPanelProps) {
  const Icon = section.icon;

  return (
    <section className="border border-main bg-main">
      <header className="border-b border-main bg-secondary/45 px-5 py-4">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted" />
          <h1 className="text-[15px] font-semibold text-main">{section.label}</h1>
        </div>
        <p className="mt-1 max-w-3xl text-[12px] leading-5 text-muted">
          {section.description}
        </p>
      </header>

      <div className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <article className="border border-main bg-secondary/20 p-4">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-muted" />
              <h2 className="text-[14px] font-semibold text-main">
                YouTube OAuth Setup
              </h2>
            </div>
            <ol className="mt-4 grid gap-2 text-[12px] leading-5 text-muted">
              {youtubeSetupSteps.map((step, index) => (
                <li key={step} className="flex gap-3 border border-main bg-main p-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center border border-main text-[10px] font-bold text-main">
                    {index + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </article>

          <article className="border border-main bg-secondary/20 p-4">
            <h2 className="text-[14px] font-semibold text-main">
              YouTube Publish Rules
            </h2>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div className="border border-main bg-main p-3">
                <p className="text-[11px] font-bold uppercase tracking-wide text-muted">
                  Required scope
                </p>
                <p className="mt-2 font-mono text-[12px] text-main">
                  https://www.googleapis.com/auth/youtube.upload
                </p>
              </div>
              <div className="border border-main bg-main p-3">
                <p className="text-[11px] font-bold uppercase tracking-wide text-muted">
                  Redirect URI format
                </p>
                <p className="mt-2 break-all font-mono text-[12px] text-main">
                  {"{SOCIAL_OAUTH_BASE_URL}"}/api/social/oauth/callback/youtube
                </p>
              </div>
              <div className="border border-main bg-main p-3 md:col-span-2">
                <p className="text-[11px] font-bold uppercase tracking-wide text-muted">
                  Shorts rule
                </p>
                <p className="mt-2 text-[12px] leading-5 text-main">
                  OmniVideo blocks `youtube_short` when asset metadata is missing,
                  duration is over 3 minutes, or the video is horizontal. This avoids
                  silently uploading a Shorts intent as a normal video.
                </p>
              </div>
            </div>
          </article>

          <article className="border border-main bg-secondary/20 p-4">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-muted" />
              <h2 className="text-[14px] font-semibold text-main">
                Google Drive OAuth Setup
              </h2>
            </div>
            <ol className="mt-4 grid gap-2 text-[12px] leading-5 text-muted">
              {driveSetupSteps.map((step, index) => (
                <li key={step} className="flex gap-3 border border-main bg-main p-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center border border-main text-[10px] font-bold text-main">
                    {index + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </article>
        </div>

        <aside className="space-y-4">
          <article className="border border-main bg-secondary/20 p-4">
            <h2 className="text-[14px] font-semibold text-main">
              Troubleshooting
            </h2>
            <div className="mt-3 space-y-3">
              {youtubeTroubleshooting.map((item) => (
                <div key={item.title} className="border border-main bg-main p-3">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted" />
                    <div>
                      <p className="text-[12px] font-semibold text-main">
                        {item.title}
                      </p>
                      <p className="mt-1 text-[11px] leading-5 text-muted">
                        {item.body}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              {driveTroubleshooting.map((item) => (
                <div key={item.title} className="border border-main bg-main p-3">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted" />
                    <div>
                      <p className="text-[12px] font-semibold text-main">
                        {item.title}
                      </p>
                      <p className="mt-1 text-[11px] leading-5 text-muted">
                        {item.body}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="border border-main bg-secondary/20 p-4">
            <h2 className="text-[14px] font-semibold text-main">
              Other Platforms
            </h2>
            <div className="mt-3 space-y-3">
              {platformCards.map((platform) => (
                <div key={platform.title} className="border border-main bg-main p-3">
                  <p className="text-[12px] font-semibold text-main">
                    {platform.title}
                  </p>
                  <p className="mt-1 font-mono text-[11px] text-muted">
                    {platform.scope}
                  </p>
                  <p className="mt-2 text-[11px] leading-5 text-muted">
                    {platform.status}
                  </p>
                </div>
              ))}
            </div>
          </article>

          <article className="border border-main bg-secondary/20 p-4">
            <h2 className="text-[14px] font-semibold text-main">
              Reference
            </h2>
            <a
              href="https://developers.google.com/youtube/v3/docs/videos/insert"
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-2 border border-main bg-main px-3 py-2 text-[12px] font-semibold text-main hover:bg-secondary"
            >
              YouTube videos.insert
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </article>
        </aside>
      </div>
    </section>
  );
}
