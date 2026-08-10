import { count, eq, isNull, or, sql as raw } from "drizzle-orm";
import { db } from "@/server/db/client";
import { giaoVien, hoSoTt29, lopHoc } from "@/server/db/schema";
import { ghiNhatKy } from "@/server/store/nhatKy";
import {
  MUC_TT29,
  soiHoSoTt29,
  type DuLieuDoiChieu,
  type KetQuaSoi,
  type MucTt29,
  type TrangThaiMuc,
} from "@/server/tinhToan/tt29";

export type DongHoSo = typeof hoSoTt29.$inferSelect;

export async function layHoSo(): Promise<DongHoSo[]> {
  return db.select().from(hoSoTt29);
}

/**
 * Đánh dấu một mục TT29 là đã công khai LÀ MỘT TUYÊN BỐ PHÁP LÝ. Phải biết ai
 * tuyên bố và lúc nào — nếu có thanh tra thì đó là câu hỏi đầu tiên.
 */
export async function datTrangThai(
  muc: MucTt29,
  trangThai: TrangThaiMuc,
  congKhaiTai?: string | null,
  ghiChu?: string | null,
  nguoiDungId: string | null = null,
) {
  const [co] = await db.select().from(hoSoTt29).where(eq(hoSoTt29.muc, muc)).limit(1);
  const gia = {
    trangThai,
    congKhaiTai: congKhaiTai ?? null,
    ghiChu: ghiChu ?? null,
    capNhatLuc: new Date(),
  };
  return db.transaction(async (tx) => {
    if (co) {
      const r = await tx.update(hoSoTt29).set(gia).where(eq(hoSoTt29.muc, muc)).returning();
      await ghiNhatKy("ho_so_tt29", r[0].id, "sua", nguoiDungId, co, r[0], tx);
      return r[0];
    }
    const r = await tx.insert(hoSoTt29).values({ muc, ...gia }).returning();
    await ghiNhatKy("ho_so_tt29", r[0].id, "them", nguoiDungId, undefined, r[0], tx);
    return r[0];
  });
}

/**
 * Đếm từ dữ liệu THẬT trong hệ thống, không hỏi lại người dùng.
 *
 * Đây là vế thứ hai của bộ soi: vế thứ nhất là điều trung tâm khai, vế này là
 * điều hệ thống thấy. Chỗ hai vế lệch nhau mới là phát hiện đáng giá.
 */
export async function thuThapDuLieu(): Promise<DuLieuDoiChieu> {
  const [gv] = await db
    .select({
      tong: count(),
      chuaCongKhai: raw<number>`count(*) filter (where ${giaoVien.congKhaiDanhSach} = false)::int`,
      truongCong: raw<number>`count(*) filter (where ${giaoVien.laGvTruongCong})::int`,
      truongCongChuaBaoCao: raw<number>`count(*) filter (where ${giaoVien.laGvTruongCong} and ${giaoVien.daBaoCaoHieuTruong} = false)::int`,
    })
    .from(giaoVien);

  const [lop] = await db
    .select({
      tong: count(),
      thieuMon: raw<number>`count(*) filter (where ${lopHoc.mon} is null or ${lopHoc.mon} = '')::int`,
      thieuHocPhi: raw<number>`count(*) filter (where ${lopHoc.hocPhiMoiBuoi} is null and ${lopHoc.hocPhiCaKhoa} is null)::int`,
    })
    .from(lopHoc);

  return {
    soGiaoVien: Number(gv?.tong ?? 0),
    soGiaoVienChuaCongKhai: Number(gv?.chuaCongKhai ?? 0),
    soGiaoVienTruongCong: Number(gv?.truongCong ?? 0),
    soGvTruongCongChuaBaoCao: Number(gv?.truongCongChuaBaoCao ?? 0),
    soLopHoc: Number(lop?.tong ?? 0),
    soLopThieuMon: Number(lop?.thieuMon ?? 0),
    soLopThieuHocPhi: Number(lop?.thieuHocPhi ?? 0),
  };
}

export async function soi(): Promise<{ ketQua: KetQuaSoi; hoSo: DongHoSo[]; duLieu: DuLieuDoiChieu }> {
  const [hoSo, duLieu] = await Promise.all([layHoSo(), thuThapDuLieu()]);
  const trangThai = Object.fromEntries(
    hoSo.map((h) => [h.muc, h.trangThai as TrangThaiMuc]),
  ) as Partial<Record<MucTt29, TrangThaiMuc>>;
  return { ketQua: soiHoSoTt29(trangThai, duLieu), hoSo, duLieu };
}

/** Đánh dấu toàn bộ giáo viên là đã có trong danh sách công khai. */
export async function danhDauCongKhaiTatCaGiaoVien(nguoiDungId: string | null = null) {
  return db.transaction(async (tx) => {
    const r = await tx
      .update(giaoVien)
      .set({ congKhaiDanhSach: true })
      .where(eq(giaoVien.congKhaiDanhSach, false))
      .returning();
    for (const g of r) await ghiNhatKy("giao_vien", g.id, "sua", nguoiDungId, undefined, g, tx);
    return r.length;
  });
}

/** Ghi nhận một giáo viên trường công đã báo cáo hiệu trưởng. */
export async function ghiNhanBaoCaoHieuTruong(giaoVienId: string, nguoiDungId: string | null = null) {
  return db.transaction(async (tx) => {
    const r = await tx
      .update(giaoVien)
      .set({ daBaoCaoHieuTruong: true })
      .where(eq(giaoVien.id, giaoVienId))
      .returning();
    if (r[0]) await ghiNhatKy("giao_vien", r[0].id, "sua", nguoiDungId, undefined, r[0], tx);
    return r[0];
  });
}

/** Giáo viên trường công chưa báo cáo — danh sách để đi hỏi từng người. */
export async function gvTruongCongChuaBaoCao() {
  return db
    .select({ id: giaoVien.id, hoTen: giaoVien.hoTen, mon: giaoVien.mon })
    .from(giaoVien)
    .where(
      raw`${giaoVien.laGvTruongCong} and ${giaoVien.daBaoCaoHieuTruong} = false`,
    );
}

export { MUC_TT29 };
