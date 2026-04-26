# Tutorial Docs

## 1. Objective

Tutor Docs gom các hướng dẫn tích hợp dài ra khỏi modal cấu hình. Modal chỉ hiển thị quick setup, redirect URI và lỗi trực tiếp; trang Tutor Docs giữ checklist đầy đủ, troubleshooting và rule vận hành.

## 2. YouTube OAuth Setup

1. Open Google Cloud Console.
2. Search for and enable YouTube Data API v3.
3. Configure OAuth consent screen.
4. Create OAuth Client ID with type Web Application.
5. Copy Client ID and Client Secret into `.env`:
   - `YOUTUBE_CLIENT_ID`
   - `YOUTUBE_CLIENT_SECRET`
6. Set `SOCIAL_OAUTH_BASE_URL` to the running app base URL, for example `http://localhost:3001` locally or the production domain.
7. Add Authorized redirect URI:
   - `{SOCIAL_OAUTH_BASE_URL}/api/social/oauth/callback/youtube`
8. Create or edit the YouTube social account, then click `Connect OAuth`.

## 3. YouTube Troubleshooting

1. `403: access_denied` while app is in testing:
   - Add your email in `APIs & Services` -> `OAuth consent screen` -> `Audience` -> `Test users`.
2. Connection Test says insufficient scopes:
   - Add `https://www.googleapis.com/auth/youtube.upload`.
   - Reconnect OAuth because old tokens do not receive newly added scopes.
3. Upload requested public/unlisted but YouTube keeps it private:
   - YouTube may force API uploads from unverified API projects to private until the project passes required review/audit.
4. Shorts intent appears as a normal video:
   - YouTube Data API uses the same upload endpoint for Shorts and videos.
   - Shorts classification depends on the media: square or vertical, and no more than 3 minutes.
   - OmniVideo blocks `youtube_short` when asset metadata is missing, video is horizontal, or duration is over 3 minutes.

## 4. Other Platform Notes

1. Facebook Reels/video:
   - Scopes: `pages_manage_posts`, `pages_read_engagement`.
   - Page ID is required for page publishing.
2. TikTok:
   - Scopes: `video.upload`, `video.publish`.
   - Real publish depends on API eligibility and app review.
3. Shopee:
   - Scopes: `shop_authorization`, `product_write`.
   - Real publish must validate shop/product ownership.
