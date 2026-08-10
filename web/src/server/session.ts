/**
 * Phiên đăng nhập — token hợp lệ chưa đủ, phiên phải còn sống.
 *
 * Bên Body không có khái niệm này: JWT 7 ngày, hết. Cho một trợ giảng nghỉ việc
 * thì cách duy nhất đuổi họ ra là đổi `JWT_SECRET`, tức đăng xuất toàn công ty.
 * Luật 91/2025 còn cho người dùng quyền yêu cầu ngừng xử lý dữ liệu của họ —
 * quyền đó không thực hiện được nếu không thu hồi được phiên.
 */

import { cookies } from "next/headers";
import { and, eq, gt, isNull, lt, or } from "drizzle-orm";
import { COOKIE_NAME, kyToken, xacMinhToken } from "@/server/auth";
import { db } from "@/server/db/client";
import { phienDangNhap } from "@/server/db/schema";
import { timNguoiDungTheoId, type VaiTro } from "@/server/store/users";

/**
 * Dọn phiên đã hết hạn hoặc đã thu hồi từ lâu.
 *
 * Audit 10/08/2026: bảng `phien_dang_nhap` chỉ lớn lên — mỗi lần đăng nhập thêm
 * một dòng, không ai xoá. Giữ 30 ngày sau khi hết hạn là đủ để còn tra được
 * "ai đăng nhập lúc nào" mà không để bảng phình vô hạn.
 */
export async function donPhienCu(): Promise<void> {
  const moc = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  await db
    .delete(phienDangNhap)
    .where(or(lt(phienDangNhap.hetHanLuc, moc), lt(phienDangNhap.thuHoiLuc, moc)));
}

export async function taoPhien(
  nguoiDungId: string,
  diaChiIp: string | null,
  trinhDuyet: string | null,
): Promise<string> {
  const { token, jti, hetHanLuc } = kyToken(nguoiDungId);
  await db.insert(phienDangNhap).values({ nguoiDungId, jti, hetHanLuc, diaChiIp, trinhDuyet });
  return token;
}

/** Thu hồi một phiên. Gọi khi đăng xuất. */
export async function thuHoiPhien(jti: string): Promise<void> {
  await db
    .update(phienDangNhap)
    .set({ thuHoiLuc: new Date() })
    .where(and(eq(phienDangNhap.jti, jti), isNull(phienDangNhap.thuHoiLuc)));
}

/** Thu hồi mọi phiên của một người. Gọi khi đổi mật khẩu, khoá tài khoản, nghỉ việc. */
export async function thuHoiTatCaPhien(nguoiDungId: string): Promise<void> {
  await db
    .update(phienDangNhap)
    .set({ thuHoiLuc: new Date() })
    .where(and(eq(phienDangNhap.nguoiDungId, nguoiDungId), isNull(phienDangNhap.thuHoiLuc)));
}

export async function layNguoiDungTuPhien() {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return undefined;

  const noiDung = xacMinhToken(token);
  if (!noiDung) return undefined;

  // Chữ ký đúng vẫn chưa đủ. Phiên phải chưa bị thu hồi và chưa hết hạn theo SỔ,
  // không theo `exp` trong token — `exp` là thứ kẻ giữ token cũ vẫn thoả.
  const rows = await db
    .select({ id: phienDangNhap.id })
    .from(phienDangNhap)
    .where(
      and(
        eq(phienDangNhap.jti, noiDung.jti),
        isNull(phienDangNhap.thuHoiLuc),
        gt(phienDangNhap.hetHanLuc, new Date()),
      ),
    )
    .limit(1);
  if (!rows[0]) return undefined;

  return timNguoiDungTheoId(noiDung.sub);
}

export async function layJtiHienTai(): Promise<string | undefined> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  return token ? (xacMinhToken(token)?.jti ?? undefined) : undefined;
}

const THU_TU: VaiTro[] = ["tro_giang", "ke_toan", "quan_ly", "admin"];

/**
 * Chặn theo cấp. Body chỉ có `requireAdmin()` và tự ghi nhận là các trang khác
 * "chưa kiểm tra quyền" — ở đây khách tự dùng nên đó không còn là thứ hoãn được.
 */
export async function yeuCauVaiTro(toiThieu: VaiTro) {
  const nguoiDung = await layNguoiDungTuPhien();
  if (!nguoiDung) return undefined;
  const co = THU_TU.indexOf(nguoiDung.vaiTro as VaiTro);
  const can = THU_TU.indexOf(toiThieu);
  if (co < 0 || co < can) return undefined;
  return nguoiDung;
}
