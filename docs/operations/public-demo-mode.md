# Public Demo Mode

## 1. Purpose

Public demo mode lets a single-user OmniVideo instance be published for visitors while keeping the real project data protected.

The default mode remains owner mode. Public demo mode must be explicitly enabled.

## 2. Environment Variables

- `OMNIVIDEO_APP_MODE`
  - `owner` or unset: normal single-owner behavior.
  - `public-demo`: visitors are treated as read-only unless they prove owner access.
- `OMNIVIDEO_OWNER_TOKEN`
  - Secret token used by the owner to unlock normal behavior in a public demo deployment.
  - Required if the owner wants browser-based owner access while `OMNIVIDEO_APP_MODE=public-demo`.
- `OMNIVIDEO_DEMO_AI_RATE_LIMIT`
  - Optional fixed-window limit per client IP and feature.
  - Default: `5`.
- `OMNIVIDEO_DEMO_AI_RATE_LIMIT_WINDOW_SECONDS`
  - Optional fixed-window duration.
  - Default: `3600`.

## 3. Owner Access

Owner access can be provided in two ways:

1. Browser unlock through the topbar `View Mode` / `Owner` control, which calls `POST /api/app/access` and stores an HTTP-only owner cookie.
2. API/script access with header `x-omnivideo-owner-token: <OMNIVIDEO_OWNER_TOKEN>`.

Owner requests bypass public demo write blocks and demo AI rate limits.

## 4. Public Visitor Policy

Public visitors in `public-demo` mode see `View Mode` in the topbar.

1. Can view read-only data returned by `GET` routes.
2. Cannot run DB-changing actions such as Video Intake, local upload intake, storage provider changes, asset writes/deletes, Inspiration Vault capture/toggle/delete, AI provider admin actions, social account changes, OAuth setup, or publish record changes.
3. Can use selected stateless/demo processing APIs with rate limits:
   - Audio transcription.
   - Transcript translation without saved provider account.
   - Voice generation / Piper TTS.
   - Video dubbing without saved provider account.
   - Video metadata without saved provider account.
   - Video mirror/edit processing on uploaded demo files.

Public requests that try to use saved AI provider accounts are blocked because that can touch private provider configuration and usage tracking.

## 5. Current Limitations

The MVP rate limiter is in-memory per server process. It is enough for a low-traffic personal demo, but a production public deployment with multiple server instances should replace it with Redis, Upstash, or another shared store.
