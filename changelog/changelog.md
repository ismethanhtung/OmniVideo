# OmniVideo Changelog

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

### Notes

- Task IDs: SETUP-DOC-002, SETUP-TASK-001, P1-HOME-001, P1-HOME-002, P1-HOME-003, P1-DB-001, P1-UX-001, P1-UX-002, P1-INTAKE-001, P1-STORAGE-001, P1-INTAKE-002, P1-INTAKE-003, P1-INTAKE-004, P1-INTAKE-005, P1-INTAKE-006, P1-INTAKE-007, P1-INTAKE-008, P1-INTAKE-009
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
