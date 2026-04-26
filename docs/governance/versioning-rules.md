# Versioning Rules (Mandatory)

## 1. Purpose

Đảm bảo version ứng dụng luôn nhất quán giữa code, UI, changelog và artifacts vận hành; tránh release mơ hồ hoặc sai lệch version.

## 2. Source of Truth

1. `package.json` field `version` là nguồn version duy nhất cho app runtime.
2. UI hiển thị version (leftbar footer) phải đọc từ source-of-truth này, không hard-code số version trong component.

## 3. SemVer Policy

Format: `MAJOR.MINOR.PATCH`

1. `PATCH`: bugfix, hardening, docs/rules updates không phá vỡ hành vi public.
2. `MINOR`: thêm tính năng backward-compatible.
3. `MAJOR`: thay đổi breaking behavior hoặc contract đáng kể.

## 4. Mandatory Update Checklist When Bumping Version

1. Cập nhật `package.json` `version`.
2. Cập nhật entry trong `changelog/changelog.md` cho release tương ứng.
3. Xác nhận leftbar/version UI hiển thị đúng version mới sau build.
4. Ghi rõ Task IDs liên quan trong changelog notes.

## 5. Release Integrity Rules

1. Không merge feature/bugfix hoàn tất release scope mà không có changelog entry tương ứng.
2. Không được hiển thị version giả hoặc placeholder trên UI.
3. Nếu có nhiều task cùng release, version bump thực hiện một lần khi chốt release batch.

## 6. AI Agent Enforcement

1. Nếu task yêu cầu thay đổi version/release behavior, agent phải kiểm tra và cập nhật checklist này.
2. Nếu phát hiện UI version lệch với source-of-truth, phải sửa trong cùng task.
