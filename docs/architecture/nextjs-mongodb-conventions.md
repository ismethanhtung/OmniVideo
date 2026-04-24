# Next.js + MongoDB Conventions

## 1. Objective

Thiết lập chuẩn triển khai kỹ thuật nhất quán cho stack Next.js + MongoDB trước khi bắt đầu code feature.

## 2. Next.js Conventions

1. Dùng App Router (`src/app`).
2. API routes đặt tại `src/app/api/*`.
3. Domain modules đặt tại `src/modules/*`.
4. Không để business logic trực tiếp trong route handlers.

## 3. Module Layout Convention

Mỗi domain module theo cấu trúc:

```txt
src/modules/<domain>/
  application/
  domain/
  infrastructure/
  index.ts
```

Ý nghĩa:

1. `application`: use-cases/services orchestration.
2. `domain`: types, rules, interfaces.
3. `infrastructure`: Mongo repos, adapters, external integrations.

## 4. MongoDB Access Convention

1. Kết nối DB tập trung ở `src/lib/db`.
2. Repository layer đọc/ghi DB, không query trực tiếp từ UI.
3. Collection names snake_case nhất quán.
4. Tạo indexes qua migration scripts/version notes.

## 5. Validation Convention

1. Validate input ở boundary (API layer).
2. Validate domain invariants trong service/use-case layer.
3. Lỗi validate trả `VAL_*` error code.

## 6. Error Handling Convention

1. Domain errors phải có error code chuẩn hóa.
2. API response lỗi gồm: `code`, `message`, `details?`, `traceId`.
3. Không leak internal stack ra response.

## 7. Observability Convention

1. Route handlers phải log requestId/traceId.
2. Use-case chính phải emit run events.
3. Integration calls phải đo latency.

## 8. Testing Convention

1. Unit test cho domain/application logic.
2. Integration test cho repository/adapters.
3. Smoke test cho API routes quan trọng.

## 9. Config Convention

1. Env vars validate tại startup.
2. Group config theo domain (`db`, `queue`, `providers`, `storage`, `social`).
3. Không dùng `process.env` rải rác nhiều nơi.
