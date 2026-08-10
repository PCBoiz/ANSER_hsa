/**
 * Ký và xác minh token. Thuần, không chạm DB — phần kiểm phiên còn sống nằm ở
 * `session.ts`.
 *
 * Bên Body dòng này là:
 *     export const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret-change-me";
 *
 * Chuỗi fallback đó nằm trong một repo công khai. Quên đặt biến môi trường thì
 * app không crash, không cảnh báo, và ký mọi token bằng một khoá cả thế giới
 * đọc được — ai cũng giả được phiên của bất kỳ ai. Không có triệu chứng nào.
 *
 * Ở đây thiếu khoá là app KHÔNG KHỞI ĐỘNG.
 */

import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";

export const COOKIE_NAME = "anser_hsa_token";
export const THOI_HAN_PHIEN_NGAY = 7;

/** Đủ dài để HS256 không phải là chỗ yếu nhất. 48 byte base64url ≈ 64 ký tự. */
const DO_DAI_TOI_THIEU = 32;

function layKhoa(): string {
  const khoa = process.env.JWT_SECRET;
  if (!khoa) {
    throw new Error(
      "Thiếu JWT_SECRET. Sinh khoá rồi đặt vào .env.local:\n" +
        '  node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'base64url\'))"',
    );
  }
  if (khoa.length < DO_DAI_TOI_THIEU) {
    throw new Error(`JWT_SECRET quá ngắn (${khoa.length} ký tự, cần ≥ ${DO_DAI_TOI_THIEU}).`);
  }
  // Chuỗi fallback của Body. Nếu ai đó copy sang thì chặn ngay tại đây.
  if (khoa === "dev-secret-change-me") {
    throw new Error("JWT_SECRET đang là chuỗi mẫu công khai. Sinh khoá thật.");
  }
  return khoa;
}

export type NoiDungToken = { sub: string; jti: string };

/** `jti` là mã phiên — thứ cho phép thu hồi một phiên mà không đá cả công ty ra. */
export function kyToken(nguoiDungId: string): { token: string; jti: string; hetHanLuc: Date } {
  const jti = randomUUID();
  const hetHanLuc = new Date(Date.now() + THOI_HAN_PHIEN_NGAY * 24 * 60 * 60 * 1000);
  const token = jwt.sign({ sub: nguoiDungId, jti }, layKhoa(), {
    expiresIn: `${THOI_HAN_PHIEN_NGAY}d`,
  });
  return { token, jti, hetHanLuc };
}

/**
 * Chỉ kiểm chữ ký và hạn. KHÔNG kết luận phiên còn sống — phiên có thể đã bị
 * thu hồi mà token vẫn hợp lệ về mặt chữ ký. Dùng `layNguoiDungTuPhien()`.
 */
export function xacMinhToken(token: string): NoiDungToken | null {
  try {
    const p = jwt.verify(token, layKhoa());
    if (typeof p === "string" || !p.sub || !p.jti) return null;
    return { sub: String(p.sub), jti: String(p.jti) };
  } catch {
    return null;
  }
}

export const tuyChonCookie = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: THOI_HAN_PHIEN_NGAY * 24 * 60 * 60, // giây, không phải mili giây
};
