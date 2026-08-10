import bcrypt from "bcryptjs";
import { asc, eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { nguoiDung } from "@/server/db/schema";

export type NguoiDung = typeof nguoiDung.$inferSelect;

/**
 * Bốn cấp, xếp từ thấp lên cao. Khác Body ba cấp `staff|manager|admin` vì
 * nghiệp vụ ở đây có một ranh giới Body không có: **kế toán được xem thù lao
 * giáo viên, trợ giảng thì không.** Đó là dữ liệu nhạy cảm nội bộ.
 */
export const VAI_TRO = ["tro_giang", "ke_toan", "quan_ly", "admin"] as const;
export type VaiTro = (typeof VAI_TRO)[number];

/** `admin` dành cho tài khoản chủ, không cấp được từ giao diện. */
export const VAI_TRO_CAP_DUOC = ["tro_giang", "ke_toan", "quan_ly"] as const;

export const NHAN_VAI_TRO: Record<VaiTro, string> = {
  tro_giang: "Trợ giảng",
  ke_toan: "Kế toán",
  quan_ly: "Quản lý",
  admin: "Quản trị",
};

export async function timNguoiDungTheoEmail(email: string): Promise<NguoiDung | undefined> {
  const rows = await db
    .select()
    .from(nguoiDung)
    .where(eq(nguoiDung.email, email.toLowerCase()))
    .limit(1);
  return rows[0];
}

export async function timNguoiDungTheoId(id: string): Promise<NguoiDung | undefined> {
  const rows = await db.select().from(nguoiDung).where(eq(nguoiDung.id, id)).limit(1);
  return rows[0];
}

export async function danhSachNguoiDung() {
  return db.select().from(nguoiDung).orderBy(asc(nguoiDung.ten));
}

export async function capNhatNguoiDung(
  id: string,
  patch: Partial<{
    ho: string;
    ten: string;
    dienThoai: string | null;
    matKhauHash: string;
    vaiTro: VaiTro;
    nhanVienId: string | null;
  }>,
): Promise<NguoiDung | undefined> {
  const rows = await db.update(nguoiDung).set(patch).where(eq(nguoiDung.id, id)).returning();
  return rows[0];
}

export async function xoaNguoiDung(id: string) {
  await db.delete(nguoiDung).where(eq(nguoiDung.id, id));
}

export async function demQuanTri() {
  const rows = await db.select().from(nguoiDung).where(eq(nguoiDung.vaiTro, "admin"));
  return rows.length;
}

export async function taoNguoiDung(input: {
  ho: string;
  ten: string;
  email: string;
  dienThoai?: string;
  matKhauHash: string;
  vaiTro?: VaiTro;
  nhanVienId?: string;
}): Promise<NguoiDung> {
  const rows = await db
    .insert(nguoiDung)
    .values({
      ho: input.ho,
      ten: input.ten,
      email: input.email.toLowerCase(),
      dienThoai: input.dienThoai,
      matKhauHash: input.matKhauHash,
      vaiTro: input.vaiTro ?? "tro_giang",
      nhanVienId: input.nhanVienId,
    })
    .returning();
  return rows[0];
}

/** Bỏ hash mật khẩu trước khi trả ra ngoài. */
export function raNgoai(u: NguoiDung) {
  const { matKhauHash: _bo, ...congKhai } = u;
  return congKhai;
}

export const TAI_KHOAN_DEMO = {
  ho: "Chủ",
  ten: "Trung tâm",
  email: "demo@anser-hsa.dev",
  matKhau: "demo1234",
};

export async function gieoTaiKhoanDemo() {
  const co = await timNguoiDungTheoEmail(TAI_KHOAN_DEMO.email);
  if (co) {
    if (co.vaiTro !== "admin") await capNhatNguoiDung(co.id, { vaiTro: "admin" });
    return;
  }
  await taoNguoiDung({
    ho: TAI_KHOAN_DEMO.ho,
    ten: TAI_KHOAN_DEMO.ten,
    email: TAI_KHOAN_DEMO.email,
    matKhauHash: bcrypt.hashSync(TAI_KHOAN_DEMO.matKhau, 10),
    vaiTro: "admin",
  });
}
