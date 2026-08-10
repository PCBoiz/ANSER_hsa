import { eq, sql as raw } from "drizzle-orm";
import { db } from "@/server/db/client";
import {
  buoiDay,
  giaoVien,
  hoSoTt29,
  khoanChi,
  khoanThu,
  lopHoc,
} from "@/server/db/schema";
import { CHI, GIAO_VIEN, LOP, THU, TT29_TRANG_THAI } from "@/server/duLieuMau/boMau";
import { MUC_TT29 } from "@/server/tinhToan/tt29";

/** Kỳ mẫu = tháng hiện tại, để bộ mẫu luôn trông như dữ liệu vừa nhập. */
function kyHienTai(): { nam: number; thang: number; ky: string } {
  const d = new Date();
  const nam = d.getUTCFullYear();
  const thang = d.getUTCMonth() + 1;
  return { nam, thang, ky: `${nam}-${String(thang).padStart(2, "0")}` };
}

const ngay = (nam: number, thang: number, d: number) =>
  `${nam}-${String(thang).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

export type KetQuaGieo = {
  ky: string;
  giaoVien: number;
  buoiDay: number;
  lopHoc: number;
  khoanThu: number;
  khoanChi: number;
  hoSoTt29: number;
};

/**
 * Gieo bộ mẫu. Mọi dòng mang `nguon = 'mau'`.
 *
 * Gieo lại khi đã có dữ liệu mẫu thì **xoá cũ trước** — không cộng dồn. Chạy
 * hai lần mà thành hai bộ là số liệu trên màn hình gấp đôi, và người xem không
 * có cách nào biết.
 */
export async function gieoBoMau(): Promise<KetQuaGieo> {
  await xoaBoMau();
  const { nam, thang, ky } = kyHienTai();

  const gvDaGieo = await db
    .insert(giaoVien)
    .values(
      GIAO_VIEN.map((g) => ({
        hoTen: g.hoTen,
        mon: g.mon,
        loai: "thinh_giang" as const,
        laGvTruongCong: g.laGvTruongCong,
        daBaoCaoHieuTruong: g.daBaoCaoHieuTruong,
        congKhaiDanhSach: g.congKhaiDanhSach,
        nguon: "mau" as const,
      })),
    )
    .returning();

  const theoTen = new Map(gvDaGieo.map((g) => [g.hoTen, g.id]));
  const buoi = GIAO_VIEN.flatMap((g) =>
    g.buoi.map((b) => ({
      giaoVienId: theoTen.get(g.hoTen)!,
      ngay: ngay(nam, thang, b.ngayTrongThang),
      donGia: b.donGia,
      tinhTheo: "buoi" as const,
      nguon: "mau" as const,
    })),
  );
  const bdDaGieo = buoi.length ? await db.insert(buoiDay).values(buoi).returning() : [];

  const lopDaGieo = await db
    .insert(lopHoc)
    .values(
      LOP.map((l) => ({
        ma: l.ma,
        ten: l.ten,
        mon: l.mon,
        hocPhiMoiBuoi: l.hocPhiMoiBuoi,
        hocPhiCaKhoa: l.hocPhiCaKhoa,
        nguon: "mau" as const,
      })),
    )
    .returning();

  const thuDaGieo = await db
    .insert(khoanThu)
    .values(
      THU.map((t) => ({
        ngay: ngay(nam, thang, t.ngayTrongThang),
        ky,
        soTien: t.soTien,
        moTa: t.moTa,
        dienThue: t.dienThue,
        dienKeKhai: t.dienKeKhai,
        nguon: "mau" as const,
      })),
    )
    .returning();

  const chiDaGieo = await db
    .insert(khoanChi)
    .values(
      CHI.map((c) => ({
        ngay: ngay(nam, thang, c.ngayTrongThang),
        ky,
        soTien: c.soTien,
        moTa: c.moTa,
        nhom: c.nhom,
        duocTru: c.duocTru,
        lyDoKhongTru: c.lyDoKhongTru ?? null,
        nguon: "mau" as const,
      })),
    )
    .returning();

  const ttDaGieo = await db
    .insert(hoSoTt29)
    .values(
      MUC_TT29.map((m) => ({
        muc: m,
        trangThai: TT29_TRANG_THAI,
        capNhatLuc: new Date(),
        nguon: "mau" as const,
      })),
    )
    .onConflictDoNothing()
    .returning();

  return {
    ky,
    giaoVien: gvDaGieo.length,
    buoiDay: bdDaGieo.length,
    lopHoc: lopDaGieo.length,
    khoanThu: thuDaGieo.length,
    khoanChi: chiDaGieo.length,
    hoSoTt29: ttDaGieo.length,
  };
}

/**
 * Xoá sạch dữ liệu mẫu, GIỮ NGUYÊN dữ liệu thật.
 *
 * Đây là lý do cột `nguon` tồn tại trên 23 bảng nghiệp vụ. Khách sẽ gõ dữ liệu
 * thật xen vào giữa dữ liệu mẫu ngay buổi đầu — xoá theo ngày tạo là xoá nhầm.
 *
 * `buoi_day` phải nhả khỏi bảng thù lao trước khi xoá, nếu không khoá ngoại chặn.
 */
export async function xoaBoMau(): Promise<Record<string, number>> {
  await db.update(buoiDay).set({ thuLaoId: null }).where(eq(buoiDay.nguon, "mau"));

  const dem: Record<string, number> = {};
  const xoa = async (ten: string, fn: () => Promise<{ rowCount?: number | null }>) => {
    const r = await fn();
    dem[ten] = r.rowCount ?? 0;
  };

  await xoa("buoi_day", () => db.delete(buoiDay).where(eq(buoiDay.nguon, "mau")));
  await xoa("giao_vien", () => db.delete(giaoVien).where(eq(giaoVien.nguon, "mau")));
  await xoa("lop_hoc", () => db.delete(lopHoc).where(eq(lopHoc.nguon, "mau")));
  await xoa("khoan_thu", () => db.delete(khoanThu).where(eq(khoanThu.nguon, "mau")));
  await xoa("khoan_chi", () => db.delete(khoanChi).where(eq(khoanChi.nguon, "mau")));
  await xoa("ho_so_tt29", () => db.delete(hoSoTt29).where(eq(hoSoTt29.nguon, "mau")));
  return dem;
}

/** Có dữ liệu mẫu trong hệ thống không — dùng để hiện banner cảnh báo. */
export async function coDuLieuMau(): Promise<boolean> {
  const [r] = await db
    .select({ n: raw<number>`count(*)::int` })
    .from(khoanThu)
    .where(eq(khoanThu.nguon, "mau"));
  if (Number(r?.n ?? 0) > 0) return true;
  const [g] = await db
    .select({ n: raw<number>`count(*)::int` })
    .from(giaoVien)
    .where(eq(giaoVien.nguon, "mau"));
  return Number(g?.n ?? 0) > 0;
}
