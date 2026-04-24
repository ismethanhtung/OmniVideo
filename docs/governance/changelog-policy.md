# Changelog Policy

## 1. Objective

Duy trì lịch sử thay đổi chính xác để truy vết được: thay gì, vì sao, thuộc task nào, rủi ro gì.

## 2. Location

File chính thức: `changelog/changelog.md`.

## 3. Update Rules

1. Mỗi task hoàn tất phải có ít nhất 1 entry changelog.
2. Entry phải ghi cụ thể thay đổi, không ghi chung chung.
3. Bắt buộc đính kèm `Task IDs`.
4. Nếu có breaking change hoặc risk, phải ghi rõ.

## 4. Entry Template

```md
## YYYY-MM-DD

### Added
- ...

### Changed
- ...

### Fixed
- ...

### Notes
- Task IDs: ...
- Risks: ...
```

## 5. Forbidden Patterns

1. "Update docs" (không nói rõ update gì).
2. "Fix bug" (không mô tả bug nào).
3. Bỏ qua task id.

## 6. Review Rule

PR/review không được chấp nhận nếu có thay đổi đáng kể mà thiếu changelog entry.
