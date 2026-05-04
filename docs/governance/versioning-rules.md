# Versioning Rules (Mandatory)

## 1. Purpose

Đảm bảo version ứng dụng luôn nhất quán giữa code, UI, changelog và artifacts vận hành; tránh release mơ hồ hoặc sai lệch version.

## 2. Source of Truth

1. `package.json` field `version` là nguồn version duy nhất cho app runtime.
2. UI hiển thị version (leftbar footer) phải đọc từ source-of-truth này, không hard-code số version trong component.

## 3. SemVer Policy (Strict, kể cả trước 1.0.0)

Format: `MAJOR.MINOR.PATCH`

1. `PATCH`: bugfix, hardening, docs/rules updates không phá vỡ hành vi public.
2. `MINOR`: thêm tính năng backward-compatible.
3. `MAJOR`: thay đổi breaking behavior hoặc contract đáng kể.

## 4. Bump Decision Matrix (Bắt buộc áp dụng)

1. Chỉ đổi bugfix/hardening, không đổi API contract public -> bump `PATCH`.
2. Có feature mới cho user hoặc API mới backward-compatible -> bump `MINOR`.
3. Có breaking change (UI flow cũ không còn đúng, API contract đổi không tương thích) -> bump `MAJOR`.
4. Chỉ thay docs/task/changelog, không đổi runtime behavior -> không bắt buộc bump ngay; được phép gộp vào release kế tiếp.
5. Một release có nhiều task: chọn mức bump cao nhất trong các task thuộc release batch.

## 5. Mandatory Update Checklist When Bumping Version

1. Cập nhật `package.json` `version`.
2. Cập nhật `package-lock.json` để đồng bộ version metadata.
3. Cập nhật entry trong `changelog/changelog.md` cho release tương ứng.
4. Xác nhận leftbar/version UI hiển thị đúng version mới sau build.
5. Ghi rõ Task IDs liên quan trong changelog notes.

## 6. Release Integrity Rules

1. Không merge feature/bugfix hoàn tất release scope mà không có changelog entry tương ứng.
2. Không được hiển thị version giả hoặc placeholder trên UI.
3. Nếu có nhiều task cùng release, version bump thực hiện một lần khi chốt release batch.
4. Không được giữ nguyên version sau khi đã chốt release scope có thay đổi runtime behavior.
5. Mỗi lần bump phải ghi rõ lý do bump (`patch/minor/major`) trong Execution Notes của task release.

## 7. Standard Bump Workflow

1. Tạo/đính kèm task release (FAST hoặc phase task).
2. Xác định mức bump theo mục 4.
3. Chạy `npm version <patch|minor|major> --no-git-tag-version`.
4. Cập nhật changelog release entry + Task IDs.
5. Chạy verify tối thiểu: `npm run build` và test scope impacted.
6. Kiểm tra UI hiển thị version mới.
7. Đóng task khi có đủ test/build evidence.

## 8. AI Agent Enforcement

1. Nếu task yêu cầu thay đổi version/release behavior, agent phải kiểm tra và cập nhật checklist này.
2. Nếu phát hiện UI version lệch với source-of-truth, phải sửa trong cùng task.
3. Nếu task là feature/bugfix đã sẵn sàng release nhưng version chưa bump, không được đánh dấu `Done`.

## 9. Automated Guard (Mandatory)

1. Runtime changes (ví dụ: `src/**`, API routes, app behavior) bắt buộc pass `npm run guard:version`.
2. Guard sẽ fail nếu có runtime change nhưng thiếu một trong ba file: `package.json`, `package-lock.json`, `changelog/changelog.md`.
3. Base ref mặc định của guard: `origin/main` merge-base; có thể override bằng env `VERSION_GUARD_BASE`.
4. Khi CI/review chạy guard và fail, task không được chuyển `Review` hoặc `Done`.
