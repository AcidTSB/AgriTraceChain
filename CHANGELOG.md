# Changelog

## 2026-04-20

### Backend stabilization
- Fixed batch creation ownership propagation at gateway path by injecting `X-User-Id` into batch create flow.
- Fixed `harvestDate` parsing in product-service batch creation to accept both datetime (`yyyy-MM-ddTHH:mm:ss`) and date-only (`yyyy-MM-dd`) formats.
- Fixed gRPC runtime compatibility issue by aligning grpc version in common-proto with service runtime stack.
- Updated API gateway auth policy: `GET /api/v1/products/**` and legacy `GET /api/products/**` are public-read, while write operations remain protected.
- Updated Postman collection with explicit `Get Products (public read)` request and assertion.
- Updated runbook to reflect current gateway farm routing and products auth policy.

### Verification
- Full Postman collection executed successfully.
- Newman automation completed with single-run pass and 10/10 loop passes.
