import { defineCloudflareConfig } from "@opennextjs/cloudflare";

/**
 * Cấu hình trần, cố ý.
 *
 * Đây là một lần THỬ để trả lời ba câu hỏi cụ thể (jsonwebtoken có chạy không,
 * gói có lọt trần 3 MiB không, giao dịch Neon có sống không) — chưa phải quyết
 * định chuyển nhà. Thêm cache tăng dần, hàng đợi, cache tag ở giai đoạn này chỉ
 * làm nhiễu kết quả đo.
 */
export default defineCloudflareConfig();
