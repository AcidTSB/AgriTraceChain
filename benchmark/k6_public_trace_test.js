import http from 'k6/http';
import { check, sleep } from 'k6';

// Cấu hình các kịch bản (scenarios) chạy test
export const options = {
    stages: [
        { duration: '10s', target: 50 },  // Ramp-up: Tăng dần lên 50 user ảo (VUs) trong 10 giây
        { duration: '30s', target: 50 },  // Duy trì 50 VUs trong 30 giây
        { duration: '10s', target: 100 }, // Ramp-up: Tăng vọt lên 100 VUs trong 10 giây (Stress Test)
        { duration: '20s', target: 100 }, // Duy trì 100 VUs trong 20 giây
        { duration: '10s', target: 0 },   // Ramp-down: Hạ dần về 0 VUs trong 10 giây
    ],
    thresholds: {
        // Đảm bảo 95% số request có độ trễ dưới 500ms
        http_req_duration: ['p(95)<500'],
        // Đảm bảo tỉ lệ lỗi dưới 1%
        http_req_failed: ['rate<0.01'],
    },
};

// Hàm chạy cho mỗi Virtual User
export default function () {
    // Mã lô hàng cần test (nên đảm bảo mã này đã tồn tại trong DB, ví dụ: BATCH-DEMO)
    const batchId = 'BATCH-TEST-001'; 
    const url = `http://localhost:8080/api/v1/trace-logs/public/${batchId}`;

    // Mô phỏng 1 request lấy thông tin truy xuất từ người tiêu dùng
    const res = http.get(url, {
        tags: { my_tag: 'public_trace_qr' },
    });

    // Kiểm tra kết quả trả về
    check(res, {
        'is status 200': (r) => r.status === 200,
        // Có thể mở comment dòng dưới nếu chắc chắn batchId tồn tại và trả về data hợp lệ
        // 'has data': (r) => r.json().data !== null,
    });

    // Giả lập thời gian nghỉ giữa các lần quét QR (user đọc thông tin)
    sleep(Math.random() * 2 + 1); // Nghỉ ngẫu nhiên từ 1 đến 3 giây
}
