import { and, asc, desc, eq, inArray, isNull, sql as raw } from "drizzle-orm";
import { db } from "@/server/db/client";
import { buoiDay, camKet08, giaoVien, thuLao } from "@/server/db/schema";
import { layThamSo } from "@/server/store/thamSo";
import { KyDaKhoaError, cacKyDangKhoa } from "@/server/store/soThuChi";
import { laKyHopLe, suyKyTuNgay } from "@/server/tinhToan/soThuChi";
import { tinhThuLao, type BuoiTinh, type KetQuaThuLao } from "@/server/tinhToan/thuLao";

export type GiaoVien = typeof giaoVien.$inferSelect;
export type BuoiDay = typeof buoiDay.$inferSelect;
export type ThuLao = typeof thuLao.$inferSelect;

/* ─────────────────────────────────────────────────────── giáo viên ───── */

export async function danhSachGiaoVien() {
  return db.select().from(giaoVien).orderBy(asc(giaoVien.hoTen));
}

export async function timGiaoVien(id: string): Promise<GiaoVien | undefined> {
  const r = await db.select().from(giaoVien).where(eq(giaoVien.id, id)).limit(1);
  return r[0];
}

export async function taoGiaoVien(input: {
  hoTen: string;
  mon?: string;
  dienThoai?: string;
  maSoThue?: string;
  laGvTruongCong?: boolean;
}) {
  const r = await db
    .insert(giaoVien)
    .values({
      hoTen: input.hoTen,
      mon: input.mon ?? null,
      dienThoai: input.dienThoai ?? null,
      maSoThue: input.maSoThue ?? null,
      loai: "thinh_giang",
      laGvTruongCong: input.laGvTruongCong ?? false,
    })
    .returning();
  return r[0];
}

export async function capNhatGiaoVien(
  id: string,
  patch: Partial<{
    hoTen: string;
    mon: string | null;
    dienThoai: string | null;
    maSoThue: string | null;
    laGvTruongCong: boolean;
    daBaoCaoHieuTruong: boolean;
    congKhaiDanhSach: boolean;
  }>,
) {
  const r = await db.update(giaoVien).set(patch).where(eq(giaoVien.id, id)).returning();
  return r[0];
}

/* ─────────────────────────────────────────────────────── buổi dạy ───── */

export type BuoiMoi = { ngay: string; donGia: number; tinhTheo: "buoi" | "gio"; soGio?: number | null };

export async function ghiBuoiDay(giaoVienId: string, cac: BuoiMoi[]) {
  if (cac.length === 0) return [];
  const cacKy = [...new Set(cac.map((b) => suyKyTuNgay(b.ngay)).filter(Boolean) as string[])];
  const khoa = await cacKyDangKhoa(cacKy);
  if (khoa.length > 0) throw new KyDaKhoaError(khoa);

  return db
    .insert(buoiDay)
    .values(
      cac.map((b) => ({
        giaoVienId,
        ngay: b.ngay,
        donGia: b.donGia,
        tinhTheo: b.tinhTheo,
        soGio: b.soGio != null ? String(b.soGio) : null,
      })),
    )
    .returning();
}

/** Buổi dạy của một giáo viên trong kỳ. `chuaChot` = chưa gắn vào bảng thù lao nào. */
export async function buoiDayTrongKy(giaoVienId: string, ky: string, chuaChot = false) {
  const dieu = [
    eq(buoiDay.giaoVienId, giaoVienId),
    raw`to_char(${buoiDay.ngay}, 'YYYY-MM') = ${ky}`,
  ];
  if (chuaChot) dieu.push(isNull(buoiDay.thuLaoId));
  return db.select().from(buoiDay).where(and(...dieu)).orderBy(asc(buoiDay.ngay));
}

export async function xoaBuoiDay(id: string) {
  const [b] = await db.select().from(buoiDay).where(eq(buoiDay.id, id)).limit(1);
  if (!b) return false;
  if (b.thuLaoId) throw new Error("Buổi này đã nằm trong một bảng thù lao đã chốt — huỷ bảng trước.");
  await db.delete(buoiDay).where(eq(buoiDay.id, id));
  return true;
}

/* ───────────────────────────────────────────────────────── thù lao ───── */

export type XemTruocThuLao = {
  giaoVienId: string;
  hoTen: string;
  ky: string;
  coCamKet08: boolean;
  ketQua: KetQuaThuLao;
  buoiIds: string[];
};

/**
 * Tính thử, chưa ghi gì. Đây là thứ hiện lên màn hình để đối chiếu trước khi chốt.
 *
 * Ngưỡng khấu trừ đọc từ `tham_so_phap_ly` theo NGÀY CUỐI KỲ, không phải hôm
 * nay: tính lại bảng thù lao tháng 6 vào tháng 8 phải ra đúng con số tháng 6,
 * kể cả khi ngưỡng đã đổi giữa chừng.
 */
export async function xemTruocThuLao(giaoVienId: string, ky: string): Promise<XemTruocThuLao | { loi: string }> {
  if (!laKyHopLe(ky)) return { loi: "Kỳ phải là YYYY-MM." };
  const gv = await timGiaoVien(giaoVienId);
  if (!gv) return { loi: "Không tìm thấy giáo viên." };

  const buoi = await buoiDayTrongKy(giaoVienId, ky, true);
  const ngayChot = ngayCuoiKy(ky);
  const nguong = await layThamSo("nguong_khau_tru_tncn_10", new Date(`${ngayChot}T00:00:00Z`));

  const nam = Number(ky.slice(0, 4));
  const ck = await db
    .select()
    .from(camKet08)
    .where(and(eq(camKet08.giaoVienId, giaoVienId), eq(camKet08.nam, nam)))
    .limit(1);
  const coCamKet08 = ck.length > 0 && ck[0].nopLuc !== null;

  const kq = tinhThuLao(
    buoi.map<BuoiTinh>((b) => ({
      ngay: b.ngay,
      donGia: Number(b.donGia),
      soGio: b.soGio === null ? null : Number(b.soGio),
      tinhTheo: b.tinhTheo as "buoi" | "gio",
    })),
    { nguongApDung: nguong, coCamKet08 },
  );
  if (!kq.ok) return { loi: kq.loi.thongDiep };

  return {
    giaoVienId,
    hoTen: gv.hoTen,
    ky,
    coCamKet08,
    ketQua: kq.ketQua,
    buoiIds: buoi.map((b) => b.id),
  };
}

/**
 * Chốt bảng thù lao: ghi `thu_lao` rồi GẮN từng buổi vào bảng đó.
 *
 * Việc gắn là điểm của A4. Không có nó thì giáo viên hỏi "sao tháng này em được
 * ngần này" mà không ai mở ra được danh sách buổi — vi phạm thẳng lời hứa "mọi
 * con số truy được về chứng từ".
 */
export async function chotThuLao(giaoVienId: string, ky: string) {
  const xem = await xemTruocThuLao(giaoVienId, ky);
  if ("loi" in xem) throw new Error(xem.loi);
  if (xem.ketQua.soBuoi === 0) throw new Error("Kỳ này chưa có buổi dạy nào chưa chốt.");

  const khoa = await cacKyDangKhoa([ky]);
  if (khoa.length > 0) throw new KyDaKhoaError(khoa);

  const [ban] = await db
    .insert(thuLao)
    .values({
      giaoVienId,
      ky,
      tongTruocThue: xem.ketQua.tongTruocThue,
      khauTruTncn: xem.ketQua.khauTruTncn,
      thucNhan: xem.ketQua.thucNhan,
      nguongApDung: xem.ketQua.nguongApDung,
      coCamKet08: xem.coCamKet08,
    })
    .returning();

  await db.update(buoiDay).set({ thuLaoId: ban.id }).where(inArray(buoiDay.id, xem.buoiIds));
  return ban;
}

export async function huyThuLao(id: string) {
  await db.update(buoiDay).set({ thuLaoId: null }).where(eq(buoiDay.thuLaoId, id));
  await db.delete(thuLao).where(eq(thuLao.id, id));
}

export async function danhSachThuLao(ky?: string) {
  const q = db.select().from(thuLao).orderBy(desc(thuLao.ky), desc(thuLao.taoLuc));
  return ky ? q.where(eq(thuLao.ky, ky)) : q;
}

/** Các buổi thuộc một bảng thù lao — chính là câu trả lời cho "gồm những buổi nào". */
export async function buoiCuaThuLao(thuLaoId: string) {
  return db.select().from(buoiDay).where(eq(buoiDay.thuLaoId, thuLaoId)).orderBy(asc(buoiDay.ngay));
}

function ngayCuoiKy(ky: string): string {
  const [nam, thang] = ky.split("-").map(Number);
  return new Date(Date.UTC(nam, thang, 0)).toISOString().slice(0, 10);
}
