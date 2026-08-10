/**
 * Kiểm biến môi trường. KHÔNG import gì — kể cả thư viện, kể cả builtin của Node.
 *
 * Lý do phải là một module rỗng phụ thuộc: `instrumentation.ts` được Next biên
 * dịch cho CẢ runtime edge, nơi không có `crypto` của Node. Trước đây nó gọi
 * thẳng `kyToken()` để chết sớm khi thiếu khoá, và thế là kéo `jsonwebtoken`
 * vào bundle edge — thư viện đó `require('crypto')` không tiền tố `node:` nên
 * không phân giải được.
 *
 * Triệu chứng khi đó cực kỳ dễ đi lạc: MỌI route trả 500, kể cả `/api/health`
 * vốn chỉ trả một chuỗi. Instrumentation hỏng là cả app hỏng, mà thông báo lỗi
 * lại nằm ở dòng đầu log chứ không ở phản hồi.
 */

/** Đủ dài để HS256 không phải là chỗ yếu nhất. 48 byte base64url ≈ 64 ký tự. */
export const DO_DAI_KHOA_TOI_THIEU = 32;

/** Chuỗi mặc định của khung Body. Nằm trong một repo công khai — chặn thẳng. */
const KHOA_MAU_CONG_KHAI = "dev-secret-change-me";

export function layKhoaKy(): string {
  const khoa = process.env.JWT_SECRET;
  if (!khoa) {
    throw new Error(
      "Thiếu JWT_SECRET. Sinh khoá rồi đặt vào web/.env.local:\n" +
        '  node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'base64url\'))"',
    );
  }
  if (khoa.length < DO_DAI_KHOA_TOI_THIEU) {
    throw new Error(`JWT_SECRET quá ngắn (${khoa.length} ký tự, cần ≥ ${DO_DAI_KHOA_TOI_THIEU}).`);
  }
  if (khoa === KHOA_MAU_CONG_KHAI) {
    throw new Error("JWT_SECRET đang là chuỗi mẫu công khai. Sinh khoá thật.");
  }
  return khoa;
}
