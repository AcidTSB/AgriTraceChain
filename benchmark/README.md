# Hướng dẫn Chạy Benchmark bằng K6

Thư mục này chứa các kịch bản kiểm thử tải (Load Test) để bạn có thể chứng minh năng lực chịu tải của hệ thống AgriTrace trong buổi bảo vệ.

## 1. Cài đặt K6
- **Windows:** Dùng lệnh `winget install k6` (nếu dùng Winget) hoặc tải file cài đặt từ [k6.io](https://k6.io/docs/get-started/installation/).
- **Mac:** `brew install k6`
- **Linux:** `sudo apt-get install k6`

## 2. Chuẩn bị dữ liệu
Trước khi chạy test, hãy chắc chắn hệ thống đang chạy (`docker-compose.prod.yml up -d`) và đã có ít nhất một lô hàng hợp lệ trong hệ thống.
Vào file `k6_public_trace_test.js` và sửa dòng sau khớp với ID lô hàng của bạn:
```javascript
const batchId = 'BATCH-TEST-001'; // Thay bằng ID thực tế
```

## 3. Chạy kịch bản
Mở terminal tại thư mục này và chạy lệnh:
```bash
k6 run k6_public_trace_test.js
```

## 4. Cách đưa vào báo cáo
Khi chạy xong, k6 sẽ in ra một bảng thống kê. Bạn hãy lấy 3 thông số này chụp ảnh đưa vào Slide/Báo cáo:
- **http_reqs:** Tổng số lượng request đã xử lý. (Ví dụ: `1500 request`)
- **http_req_duration:** Thời gian phản hồi. Lấy con số `p(95)` (95% request trả về dưới mức này). Ví dụ: `p(95)=250ms`.
- **http_req_failed:** Tỉ lệ lỗi (nên ở mức 0.00%).

> Mẹo khi bảo vệ: "Hệ thống của chúng em tuy là đồ án mô phỏng, nhưng đã thiết lập sẵn Benchmark bằng công cụ k6. Khi bắn tải 100 User ảo đồng thời quét mã QR (API Gateway -> Trace Service -> Database), hệ thống phản hồi ổn định với p(95) < 300ms mà không làm rớt request nào."
