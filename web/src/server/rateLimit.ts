/**
 * Chặn dò mật khẩu.
 *
 * Body không có lớp này: `/api/auth/login` nhận bao nhiêu lần thử cũng được.
 * Với một sản phẩm mở cho khách đăng nhập và giữ dữ liệu học viên, đó là mặt
 * tấn công rẻ nhất — một vòng lặp curl là đủ.
 *
 * Đếm trong DB chứ không trong bộ nhớ tiến trình: Next.js chạy nhiều worker, và
 * bộ đếm trong RAM reset mỗi lần deploy — đúng lúc không nên reset.
 */

import { and, count, eq, gte, lt, or } from "drizzle-orm";
import { db } from "@/server/db/client";
import { lanDangNhapHong } from "@/server/db/schema";

export const NGUONG_LAN_HONG = 8;
export const CUA_SO_PHUT = 15;

function moc(): Date {
  return new Date(Date.now() - CUA_SO_PHUT * 60 * 1000);
}

/** Đếm theo CẢ email lẫn IP: một IP dò nhiều email cũng phải bị chặn. */
export async function biChan(email: string, diaChiIp: string | null): Promise<boolean> {
  const dieuKienIp = diaChiIp ? eq(lanDangNhapHong.diaChiIp, diaChiIp) : undefined;
  const rows = await db
    .select({ n: count() })
    .from(lanDangNhapHong)
    .where(
      and(
        gte(lanDangNhapHong.taoLuc, moc()),
        dieuKienIp
          ? or(eq(lanDangNhapHong.email, email.toLowerCase()), dieuKienIp)
          : eq(lanDangNhapHong.email, email.toLowerCase()),
      ),
    );
  return (rows[0]?.n ?? 0) >= NGUONG_LAN_HONG;
}

export async function ghiLanHong(email: string, diaChiIp: string | null): Promise<void> {
  await db.insert(lanDangNhapHong).values({ email: email.toLowerCase(), diaChiIp });
}

/** Gọi sau khi đăng nhập thành công — đừng để lần hỏng cũ treo án người dùng thật. */
export async function xoaLanHong(email: string): Promise<void> {
  await db.delete(lanDangNhapHong).where(eq(lanDangNhapHong.email, email.toLowerCase()));
}

/**
 * Dọn rác đã quá cửa sổ.
 *
 * Audit 10/08/2026: `xoaLanHong` chỉ xoá theo email đăng nhập THÀNH CÔNG. Dòng
 * của những email không bao giờ đăng nhập được — tức là chính đám dò mật khẩu —
 * nằm lại vĩnh viễn. Bảng chỉ lớn lên, và mỗi lần kiểm chặn lại quét qua nhiều
 * hơn một chút.
 *
 * Gọi kèm lúc đăng nhập cho rẻ, không cần cron. Ngoài cửa sổ thì dòng đó không
 * còn ảnh hưởng quyết định chặn nữa nên xoá là an toàn.
 */
export async function donRacCu(): Promise<void> {
  await db.delete(lanDangNhapHong).where(lt(lanDangNhapHong.taoLuc, moc()));
}
