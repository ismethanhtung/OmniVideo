# OmniVideo Changelog

## 2026-04-26

### Added

- Thêm Social Platform Control Center cho Facebook/TikTok/Shopee/YouTube gồm Social Accounts, Platform Tasks và Publish Records trong dashboard.
- Thêm social domain foundation tại `src/lib/social/*`: account validation, secret masking, capability registry, publish record validation, retry eligibility và connection checks.
- Thêm API social foundation: `GET/POST /api/social/accounts`, `GET/PATCH/DELETE /api/social/accounts/[accountId]`, `GET /api/social/capabilities`, `GET/POST /api/social/publish-records`, `GET /api/social/dashboard`.
- Thêm `social` checks vào `GET /api/health/connections` và Connection Test panel.
- Thêm Vitest config alias `@ -> src` để API route contract tests import App Router routes ổn định.
- Thêm tests cho social validation, capability registry, secret masking, retry eligibility, connection checks và social API validation contracts.
- Thêm modal hướng dẫn cấu hình social account theo từng platform và `Publish now` intent cho publish records.
- Thêm OAuth foundation cho social accounts: `GET /api/social/oauth/start` và `GET /api/social/oauth/callback/[platform]` cho Facebook/TikTok/YouTube authorization-code flow.
- Thêm trạng thái lỗi riêng trong modal New/Edit Social Account và hướng dẫn YouTube OAuth kèm redirect URI cần cấu hình.
- Thêm hướng dẫn Google OAuth test users cho lỗi `403: access_denied` khi app còn ở testing.
- Thêm YouTube social connection check thật qua YouTube Data API `channels?mine=true`.
- Thêm kiểm tra YouTube tokeninfo để xác nhận access token có scope `https://www.googleapis.com/auth/youtube.upload`.
- Thêm YouTube `Publish now` adapter dùng resumable upload để đăng video thật từ storage asset.
- Thêm unit tests cho YouTube upload adapter, bao gồm refresh-token flow.
- Thêm chọn YouTube privacy trong New Publish Record và lưu `privacyStatus` vào publish records.
- Thêm guardrails cho YouTube Shorts: chặn video thiếu metadata, video ngang hoặc dài hơn 3 phút trước khi upload.

### Changed

- Cập nhật social docs/data model/roadmap/connection docs theo hướng Control Center trước; YouTube đã bật adapter upload thật, Facebook/TikTok/Shopee vẫn deferred.
- Cập nhật Publish Records để lưu `publishMode` (`schedule` hoặc `publish_now`); YouTube `publish_now` gọi upload thật, platform chưa có adapter sẽ fail rõ ràng thay vì giả vờ đã đăng.
- Cập nhật Publish Records modal: mặc định `Publish now`, chỉ hiển thị `Scheduled At` khi schedule, hiển thị trạng thái đang upload và khóa submit để tránh double publish.
- Cập nhật social docs với khuyến nghị OAuth/refresh-token flow là hướng dài hạn, manual access token chỉ là fallback/debug.
- Cập nhật social account status semantics: account mới là `needs_auth`, chỉ OAuth callback/token exchange thành công mới set `connected`; Connection Test báo `AUTH_SOCIAL_NOT_CONNECTED` khi chưa kết nối thật.
- Cập nhật Social Accounts UI để lỗi OAuth/config trong modal không còn ghi đè status bar của toàn trang.
- Cập nhật Connection Test để YouTube account `connected` không còn bị skipped nếu có access token.
- Cập nhật YouTube Connection Test không dùng endpoint đọc channel nữa, tránh yêu cầu scope đọc không cần thiết; nếu thiếu upload scope sẽ báo `AUTH_YOUTUBE_SCOPE_MISSING`.
- Cập nhật hướng dẫn YouTube: sau khi thêm scope trong Google Cloud phải OAuth connect lại vì token cũ không tự nhận scope mới.
- Cập nhật API `GET /api/storage/providers/[providerId]` để trả editable payload (bao gồm secrets) phục vụ hydrate form edit.
- Cập nhật Storage Providers UI: khi bấm `Edit` sẽ fetch chi tiết provider và nạp lại toàn bộ cấu hình đã lưu trước đó vào modal.
- Cập nhật confirm modal Drive fallback trong Local Upload Intake để có thêm lựa chọn `Upload anyway`.
- Cập nhật Storage Library table: thêm cột preview video inline trước `Asset`, bỏ cột `Created` và chuyển `Created` vào detail modal.
- Cập nhật navigation gộp `Typography + Appearance` thành section `Display`.
- Cập nhật App Shell + Content Router để áp dụng và lưu local preferences cho 5 font + 7 theme.
- Cập nhật Display panel với branding block (logo GIF + wordmark OmniVideo) theo style logo ban đầu.
- Cập nhật Appearance options thêm theme `Light Pastel Pink`.
- Cập nhật style actions dùng semantic tokens theo theme (`btn-danger`, `btn-success`) để đồng nhất light/dark.

### Fixed

- Sửa lỗi form `Edit` storage provider bị trống secret fields dù account đã cấu hình từ trước.
- Sửa UX fallback local upload cho file lớn: user có thể giữ upload qua Telegram theo ý muốn thay vì chỉ có chuyển sang Drive hoặc hủy.
- Sửa style nút `Delete` ở Storage Providers/Storage Library để hiển thị đúng trong dark mode.
- Sửa regressions semantic color: khôi phục màu đỏ cho `Delete` và màu xanh cho `Activate` nhưng vẫn tương thích dark mode.

### Notes

- Task IDs: P2-SOCIAL-001, P2-SOCIAL-002, P2-SOCIAL-003, P2-SOCIAL-004, P2-SOCIAL-005, P2-SOCIAL-006, P2-SOCIAL-007, P2-SOCIAL-008, P2-SOCIAL-009, P2-SOCIAL-010, P2-SOCIAL-011, P2-SOCIAL-012, P2-SOCIAL-013, P1-STORAGE-006, P1-UX-003, P1-UX-004
- Verification: `npm run test` pass (93 tests / 22 files); `npm run build` pass. Build còn warning cũ: `src/features/workspace/display-preferences-panel.tsx` import `Image` không dùng.
- Risks: YouTube `Publish now` đã upload thật nhưng đang đọc video vào memory trước khi gửi; Shorts phụ thuộc metadata duration/width/height trong asset; Facebook/TikTok/Shopee real publish adapters vẫn deferred.

## 2026-04-25

### Added

- Thêm `docs/SYSTEM-SUMMARY.md` làm bản tổng hợp chuẩn toàn bộ hệ thống và toàn bộ bộ docs hiện hữu.
- Thêm `docs/architecture/testing-strategy.md` để chuẩn hóa chiến lược test cho stack Next.js + MongoDB.
- Thêm `docs/governance/testing-rules.md` với quy tắc cứng: code change phải có test tương ứng, bugfix phải có regression test.
- Thêm `docs/operations/test-execution-playbook.md` để chuẩn hóa quy trình chạy test và xử lý test failures.
- Thêm bộ khung Next.js App Router ban đầu gồm `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`.
- Thêm module homepage mới tại `src/modules/home/*` theo cấu trúc config/types/utils/components.
- Thêm unit test cho utility lọc sidebar nav tại `src/modules/home/utils/filter-nav-groups.test.ts`.
- Thêm cấu trúc leftbar mới theo hướng create-next tại `src/components/layout/leftbar.tsx`.
- Thêm MongoDB foundation tại `src/lib/config/env.ts` và `src/lib/db/mongodb.ts`.
- Thêm endpoint health check kết nối DB tại `src/app/api/health/db/route.ts`.
- Thêm Video Intake page để nhập URL, tags, storage provider và chạy node pipeline.
- Thêm Storage Library page để quản lý metadata video đã lưu trong MongoDB.
- Thêm API `POST /api/video-intake/runs` cho URL intake pipeline và `GET /api/storage/assets` cho danh sách video assets.
- Thêm node pipeline MVP gồm validate source URL, resolve media URL, upload storage và persist asset metadata.
- Thêm Telegram storage adapter dùng remote media URL và Google Drive adapter dùng resumable upload từ remote stream.
- Thêm test runner Vitest và unit tests cho platform detection, validation, pipeline definition, asset metadata mapping.
- Thêm Storage Providers page/API để quản lý nhiều Telegram/Drive/S3/local/other storage accounts với secret masking.
- Thêm domain module `src/lib/storage-providers/*` với validation, secret sanitization và status update.
- Thêm Video Intake run history để xem nhanh các run gần nhất, status, source, storage và lỗi.
- Thêm lựa chọn storage account thật trong Video Intake thay vì hard-code provider type.
- Thêm pagination cho Intake Run History (`page`, `pageSize`, `total`, `totalPages`) và điều hướng Prev/Next trên UI.
- Thêm Telegram upload fallback: nếu `sendVideo` bằng remote URL thất bại do Telegram không đọc được URL nguồn, hệ thống tự fallback upload binary trực tiếp.
- Cải thiện source fetch cho direct media URL bằng retry với browser-like headers khi gặp 401/403 từ host nguồn.
- Thêm built-in media resolver trong app bằng local `yt-dlp` runtime đặt tại workspace `.vendor/python`.
- Thêm bridge `internal-resolver.py` + `internal-resolver.ts` để resolve YouTube/TikTok/Facebook URL ngay trong Next.js app.
- Thêm API run detail `GET /api/video-intake/runs/[runId]` để lấy step trace chi tiết.
- Thêm propagation `requestHeaders` từ built-in resolver sang source fetch/upload.
- Thêm fallback profile cho built-in YouTube resolver: thử default trước, nếu fail sẽ retry với Android client.
- Thêm regression test `src/lib/video-intake/media-resolver.test.ts` để khóa lỗi mất `requestHeaders` từ resolver payload.
- Thêm quality selector cho Video Intake (`best`, `1080p`, `720p`, `480p`, `360p`) và truyền qualityPreference vào pipeline payload.
- Thêm helper `src/lib/storage/storage-location.ts` và test `src/lib/storage/storage-location.test.ts` để build link mở storage cho Drive/Telegram.
- Thêm API `GET /api/storage/assets/[assetId]/download` để tải asset từ Telegram/Drive thông qua credentials server-side.
- Thêm metadata format thực tế từ resolver (`actualQuality`, `resolution`, `formatId`, codec fields) vào video asset.
- Thêm normalize Douyin `modal_id` URL trước khi gọi resolver nội bộ.
- Thêm section `Local Upload Intake` và API multipart `POST/GET /api/video-intake/local-runs` để upload video local lên storage.
- Thêm local intake pipeline definition + validation cho local file upload path.
- Thêm helper `src/lib/storage/telegram-download.ts` + test để chuẩn hóa giới hạn Telegram Bot API download.
- Thêm API `GET /api/health/connections` để tổng hợp connection check MongoDB + Telegram/Drive.
- Thêm module `src/lib/connections/storage-checks.ts` + test cho kiểm tra health từng storage account Telegram/Drive.
- Thêm helper `src/lib/storage/drive-service-account.ts` + test để exchange access token từ Google Service Account JSON key.
- Thêm helper `src/lib/video-intake/local-upload-routing.ts` + test để áp dụng rule xác nhận chuyển Telegram -> Drive cho local file lớn.
- Thêm helper `src/lib/storage/google-drive-error.ts` + test để parse lỗi Google Drive chi tiết.
- Thêm API `DELETE /api/storage/providers/[providerId]` và `DELETE /api/storage/assets/[assetId]`.
- Thêm API `POST /api/storage/assets` để tạo manual video asset metadata trong Storage Library.

### Changed

- Cập nhật `docs/README.md` để bổ sung điều hướng Master Summary và testing docs.
- Cập nhật `docs/AGENTS.md` và `AGENTS.md` thành onboarding guide đồng bộ với testing rules mới.
- Cập nhật `README.md` để nêu rõ rule bắt buộc: code change phải có test.
- Cập nhật governance docs (`ai-agent-rules`, `definition-of-ready-done`, `engineering-rules`, `task-standard`) theo chuẩn testing bắt buộc.
- Cập nhật `tasks/templates/task-template.md` để thêm progress stamp `[ ]/[x]`, `Task Type`, checklist `feature/bugfix/research`, và `Test Evidence`.
- Cập nhật `tasks/README.md` để chuẩn hóa workflow đóng dấu `[x]` theo tiến độ task.
- Cập nhật `tasks/TASK-SETUP-TASK-001.md` và `tasks/board.md` để phản ánh trạng thái hoàn tất cải tiến template.
- Cập nhật `package.json` để thêm scripts và dependencies cho homepage bootstrap + test script.
- Cập nhật app shell về chế độ `leftbar-only` theo yêu cầu hiện tại và bỏ phần main content cũ.
- Cập nhật branding leftbar thành `OmniVideo` và footer `OmniVideo + v0.1.0`.
- Chuyển giao diện mặc định sang light mode (không gán dark theme mặc định).
- Cập nhật leftbar để item `Connection Test` gọi `/api/health/db` và hiển thị trạng thái MongoDB trực tiếp.
- Refactor lại UX navigation: leftbar chỉ điều hướng, nội dung hiển thị ở panel phải theo section active.
- Chuyển `Connection Test` sang panel phải và chạy DB health check tại khu vực content thay vì trong sidebar.
- Refactor homepage thành kiến trúc mở rộng gồm `AppShell`, `ContentRouter`, navigation registry và feature panels riêng.
- Rút gọn `src/app/page.tsx` thành entry point mỏng, không chứa logic tab/feature.
- Cập nhật env config để hỗ trợ `VIDEO_RESOLVER_ENDPOINT`, Telegram và Google Drive credentials.
- Cập nhật leftbar với nhóm `Video Pipeline` gồm `Video Intake` và `Storage Library`.
- Cập nhật storage docs/data model để phân biệt storage provider accounts với video asset library.
- Cập nhật Video Intake để upload bằng secrets của storage account active đã chọn.
- Cập nhật Storage Providers UI để form tạo account chỉ hiển thị sau khi bấm New.
- Cập nhật trạng thái Refresh trong Intake Run History để có loading feedback và lỗi tải history rõ hơn.
- Cập nhật media resolver sang fallback chain: direct URL -> external endpoint nếu có -> built-in resolver nội bộ.
- Cập nhật Run Status của Video Intake để hiển thị step-level trace (`validate`, `resolve`, `upload`, `persist`) và node lỗi cụ thể.
- Cập nhật internal resolver strategy để tăng tỷ lệ lấy direct media URL fetchable từ YouTube.
- Cập nhật media resolver mapping để giữ lại `requestHeaders` cho bước upload storage fetch source.
- Cập nhật built-in Python resolver: probe fetchability direct URL theo chuỗi profile (`default` -> `youtube-android`) trước khi trả payload.
- Cập nhật Storage Library UI để hiển thị thêm dữ liệu quan trọng (status, size, duration, resolver, requested quality, provider asset id, run/source refs) cùng detail row mở rộng.
- Cập nhật Storage Providers UI: form tạo account được mở bằng modal thay vì pane bên trái.
- Cập nhật Storage Library detail sang modal và thêm action `Download` cho từng asset.
- Cập nhật resolver error cleanup để bỏ Python deprecation noise và hướng dẫn cookie config khi Douyin/TikTok yêu cầu cookies.
- Cập nhật internal resolver profile strategy: chỉ dùng fallback `youtube-android` cho YouTube và thêm auto browser-cookie profile chain cho TikTok/Douyin.
- Cập nhật `README.md` và `.env.example` để bổ sung biến cấu hình cookies cho resolver TikTok/Douyin.
- Cập nhật app shell với top bar `h-12` đồng bộ header leftbar, có dark/light toggle và quick actions cho local upload flow.
- Cập nhật video intake repository/asset metadata để hỗ trợ pipeline id `mvp-local-intake-to-storage` và source type `file`.
- Cập nhật `next.config.ts` để tách artifact dir cho dev/build (`.next-dev` và `.next`) nhằm giảm lỗi chunk missing khi làm việc local.
- Cập nhật Connection Test panel để hiển thị chi tiết checks theo từng service/account (status, latency, message).
- Cập nhật Storage Providers modal cho Drive: hỗ trợ upload file JSON key hoặc paste JSON key trực tiếp, giữ `accessToken` dạng legacy.
- Cập nhật Drive upload/check runtime để resolve token theo `driveServiceAccountJson` (Service Account) hoặc fallback `accessToken` cũ.
- Cập nhật Local Upload Intake: khi chọn Telegram và file >20MB, UI hiển thị confirm modal để user quyết định chuyển sang Drive account active.
- Cập nhật API download asset hỗ trợ `disposition=inline` + `Range` forwarding để phục vụ video preview/player.
- Cập nhật Storage Library: thêm action preview và inline video player trong modal chi tiết asset.
- Cập nhật Storage Providers: hỗ trợ edit cấu hình account hiện có (label/description/priority/tags/secrets) từ UI.
- Cập nhật Storage Library UX: preview chuyển thành `Play` mở modal inline player; download tách thành action riêng.

### Fixed

- Chuẩn hóa lại DoD/agent protocol để không còn khoảng trống "code xong nhưng thiếu test".
- Chuẩn hóa cách nhìn tiến độ task để giảm bỏ sót bước khi thực thi.
- Giảm độ phức tạp cấu trúc component leftbar theo feedback trực tiếp của owner.
- Sửa sai luồng UX trước đó: không hiển thị kết quả connection check trong leftbar.
- Sửa vấn đề tổ chức code khiến homepage khó mở rộng khi số lượng tab leftbar tăng lên.
- Chuẩn hóa failure path khi URL nền tảng chưa có direct media resolver: fail rõ lỗi `VID_RESOLVER_REQUIRED` và lưu trace.
- Làm rõ failure `VID_RESOLVER_REQUIRED` trên UI Video Intake bằng hướng dẫn cấu hình `VIDEO_RESOLVER_ENDPOINT` hoặc dùng direct media URL.
- Cải thiện độ ổn định upload Telegram cho direct media URL bằng fallback multipart upload khi gặp lỗi `failed to get HTTP URL content` hoặc `wrong type of the web page content`.
- Làm rõ failure `STG_TELEGRAM_SOURCE_STREAM_FAILED` (403 từ source host) là lỗi quyền truy cập nguồn, không phải lỗi token Telegram.
- Gỡ phụ thuộc bắt buộc vào `VIDEO_RESOLVER_ENDPOINT` cho các nguồn page URL khi local resolver runtime khả dụng.
- Giảm lỗi `403` khi fetch direct URL từ resolver bằng cách dùng đúng headers mà extractor trả về cho source host.
- Giảm lỗi `403` do web client extraction bằng fallback resolver sang Android client profile.
- Sửa bug làm rơi resolver `requestHeaders` trước upload step, nguyên nhân khiến YouTube direct URL fetch bị `403`.
- Sửa thiếu liên kết mở nơi lưu ở Storage Library bằng cơ chế ưu tiên `publicUrl/webViewLink` và fallback Telegram message URL inference.
- Sửa lỗi Douyin URL dạng `jingxuan?modal_id=...` bị báo unsupported trước khi đến extractor đúng.
- Sửa lỗi intake TikTok/Douyin phụ thuộc cấu hình cookies thủ công bằng fallback tự thử cookies từ browser profiles khi env chưa cấu hình.
- Sửa lỗi download Telegram asset lớn trả message mơ hồ bằng error code rõ `STG_TELEGRAM_FILE_TOO_BIG_FOR_BOT_DOWNLOAD`.
- Sửa UX Storage Library: disable nút Download với Telegram asset vượt giới hạn bot download và hiển thị lý do.
- Sửa thiếu khả năng kiểm tra kết nối Telegram/Drive trong Connection Test bằng flow health check mới.
- Sửa lỗi Drive upload/download chỉ trả thông báo 403 chung chung bằng message chi tiết hơn từ Google API + hint quyền folder/service account.
- Sửa false-positive Connection Test Drive trong trường hợp token hợp lệ nhưng `folderId` không đủ quyền bằng folder access probe.
- Sửa thiếu thao tác vận hành cơ bản bằng cách bổ sung delete cho provider và asset ngay trong dashboard.

### Notes

- Task IDs: SETUP-DOC-002, SETUP-TASK-001, P1-HOME-001, P1-HOME-002, P1-HOME-003, P1-DB-001, P1-UX-001, P1-UX-002, P1-INTAKE-001, P1-STORAGE-001, P1-INTAKE-002, P1-INTAKE-003, P1-INTAKE-004, P1-INTAKE-005, P1-INTAKE-006, P1-INTAKE-007, P1-INTAKE-008, P1-INTAKE-009, P1-STORAGE-002, P1-INTAKE-010, P1-INTAKE-012, P1-STABILITY-001, P1-CONN-001, P1-STORAGE-003, P1-STORAGE-004, P1-STORAGE-005
- Risks: Storage provider secrets đang được hỗ trợ ở dạng inline MongoDB cho MVP; production cần secret manager hoặc encryption at-rest.

## 2026-04-24

### Added

- Thiết lập documentation system đầy đủ cho repo trong `docs/` theo các cụm product, architecture, domains, operations, governance.
- Bổ sung bộ governance rules chuẩn hóa cách làm việc cho engineering và AI agents.
- Bổ sung task system hoàn chỉnh trong `tasks/` gồm board, backlog, template và task setup mẫu.
- Bổ sung architecture specs cho stack Next.js + MongoDB, gồm system overview, node architecture, data model, integration boundaries.
- Bổ sung operations docs cho observability, connection center, incident playbook.
- Bổ sung domain specs cho source/provider/social/storage/video pipeline/multilingual audio/affiliate blueprint.

### Changed

- Cập nhật `README.md` thành entrypoint điều hướng tài liệu chính thức.

### Fixed

- Chuẩn hóa lại vị trí changelog chính thức về `changelog/changelog.md` để tránh phân tán tài liệu.

### Notes

- Task IDs: SETUP-DOC-001, SETUP-GOV-001, SETUP-ARCH-001
- Risks: Cần duy trì cập nhật docs đồng bộ với code trong các phase triển khai tiếp theo.
