import { and, desc, eq, inArray, sql as raw } from "drizzle-orm";
import { db } from "@/server/db/client";
import { khoanChi, khoanThu, kyKeToan } from "@/server/db/schema";
import { ghiNhatKy } from "@/server/store/nhatKy";
import { laKyHopLe, suyKyTuNgay } from "@/server/tinhToan/soThuChi";

export type KhoanThu = typeof khoanThu.$inferSelect;
export type KhoanChi = typeof khoanChi.$inferSelect;

export class KyDaKhoaError extends Error {
  constructor(public cacKy: string[]) {
    super(
      cacKy.length === 1
        ? `Kỳ ${cacKy[0]} đã khoá sổ. Mở khoá ở mục Kỳ kế toán rồi ghi lại.`
        : `Các kỳ đã khoá sổ: ${cacKy.join(", ")}. Mở khoá rồi ghi lại.`,
    );
    this.name = "KyDaKhoaError";
  }
}

/* ───────────────────────────────────────────────────── khoá kỳ ───── */

/**
 * Kỳ nào trong danh sách đang khoá.
 *
 * Kỳ chưa có dòng nào trong `ky_ke_toan` được coi là ĐANG MỞ — không tự tạo
 * dòng, không tự khoá. Mặc định phải là cho ghi, vì mặc định chặn thì khách gõ
 * dòng đầu tiên đã bị từ chối mà không hiểu vì sao.
 */
export async function cacKyDangKhoa(cacKy: string[]): Promise<string[]> {
  if (cacKy.length === 0) return [];
  const rows = await db
    .select({ ky: kyKeToan.ky })
    .from(kyKeToan)
    .where(and(inArray(kyKeToan.ky, cacKy), eq(kyKeToan.trangThai, "da_khoa")));
  return rows.map((r) => r.ky);
}

async function chanNeuKhoa(cacKy: string[]) {
  const khoa = await cacKyDangKhoa(cacKy);
  if (khoa.length > 0) throw new KyDaKhoaError(khoa);
}

/* ────────────────────────────────────────────────────── ghi sổ ───── */

export type DongThuMoi = {
  ngay: string; // ISO 'YYYY-MM-DD'
  soTien: number;
  moTa?: string;
  dienThue?: string;
  dienKeKhai?: string;
};

export type DongChiMoi = {
  ngay: string;
  soTien: number;
  moTa?: string;
  nhom: string;
  duocTru?: boolean;
  lyDoKhongTru?: string;
};

/** Kỳ luôn SUY TỪ NGÀY, không nhận từ ngoài — hai chỗ lệch nhau là báo cáo sai. */
function kyCua(ngay: string): string {
  const ky = suyKyTuNgay(ngay);
  if (!ky || !laKyHopLe(ky)) throw new Error(`Ngày không hợp lệ: ${ngay}`);
  return ky;
}

export async function ghiKhoanThu(cac: DongThuMoi[], nguoiDungId: string): Promise<KhoanThu[]> {
  if (cac.length === 0) return [];
  const kem = cac.map((d) => ({ ...d, ky: kyCua(d.ngay) }));
  await chanNeuKhoa([...new Set(kem.map((d) => d.ky))]);

  return db.transaction(async (tx) => {
    const rows = await tx
      .insert(khoanThu)
      .values(
        kem.map((d) => ({
          ngay: d.ngay,
          ky: d.ky,
          soTien: d.soTien,
          moTa: d.moTa ?? null,
          dienThue: d.dienThue ?? "chua_quyet",
          dienKeKhai: d.dienKeKhai ?? "chua_quyet",
        })),
      )
      .returning();
    for (const r of rows) await ghiNhatKy("khoan_thu", r.id, "them", nguoiDungId, undefined, r, tx);
    return rows;
  });
}

export async function ghiKhoanChi(cac: DongChiMoi[], nguoiDungId: string): Promise<KhoanChi[]> {
  if (cac.length === 0) return [];
  const kem = cac.map((d) => ({ ...d, ky: kyCua(d.ngay) }));
  await chanNeuKhoa([...new Set(kem.map((d) => d.ky))]);

  return db.transaction(async (tx) => {
    const rows = await tx
      .insert(khoanChi)
      .values(
        kem.map((d) => ({
          ngay: d.ngay,
          ky: d.ky,
          soTien: d.soTien,
          moTa: d.moTa ?? null,
          nhom: d.nhom,
          duocTru: d.duocTru ?? false,
          lyDoKhongTru: d.lyDoKhongTru ?? null,
        })),
      )
      .returning();
    for (const r of rows) await ghiNhatKy("khoan_chi", r.id, "them", nguoiDungId, undefined, r, tx);
    return rows;
  });
}

export async function xoaKhoanThu(id: string, nguoiDungId: string) {
  const [cu] = await db.select().from(khoanThu).where(eq(khoanThu.id, id)).limit(1);
  if (!cu) return false;
  await chanNeuKhoa([cu.ky]);
  await db.transaction(async (tx) => {
    await tx.delete(khoanThu).where(eq(khoanThu.id, id));
    await ghiNhatKy("khoan_thu", id, "xoa", nguoiDungId, cu, undefined, tx);
  });
  return true;
}

export async function xoaKhoanChi(id: string, nguoiDungId: string) {
  const [cu] = await db.select().from(khoanChi).where(eq(khoanChi.id, id)).limit(1);
  if (!cu) return false;
  await chanNeuKhoa([cu.ky]);
  await db.transaction(async (tx) => {
    await tx.delete(khoanChi).where(eq(khoanChi.id, id));
    await ghiNhatKy("khoan_chi", id, "xoa", nguoiDungId, cu, undefined, tx);
  });
  return true;
}

/**
 * Đánh dấu kê khai hàng loạt.
 *
 * Mặc định của mỗi dòng là `chua_quyet` — chưa ai quyết. Không có nút này thì
 * kế toán phải bấm từng dòng trong hàng trăm dòng, và cái gì phải bấm hàng trăm
 * lần thì rốt cuộc không ai bấm, rồi báo cáo thuế không chạy được.
 */
export async function danhDauKeKhai(
  ids: string[],
  dien: "da_ke_khai" | "chua_ke_khai" | "chua_quyet",
  nguoiDungId: string,
): Promise<number> {
  if (ids.length === 0) return 0;
  const cu = await db.select().from(khoanThu).where(inArray(khoanThu.id, ids));
  if (cu.length === 0) return 0;
  await chanNeuKhoa([...new Set(cu.map((r) => r.ky))]);

  const banCu = new Map(cu.map((r) => [r.id, r]));
  return db.transaction(async (tx) => {
    const moi = await tx
      .update(khoanThu)
      .set({ dienKeKhai: dien })
      .where(inArray(khoanThu.id, ids))
      .returning();
    for (const r of moi) await ghiNhatKy("khoan_thu", r.id, "sua", nguoiDungId, banCu.get(r.id), r, tx);
    return moi.length;
  });
}

/* ─────────────────────────────────────────────────────── đọc sổ ───── */

export async function danhSachKhoanThu(ky?: string) {
  const q = db.select().from(khoanThu).orderBy(desc(khoanThu.ngay), desc(khoanThu.taoLuc));
  return ky ? q.where(eq(khoanThu.ky, ky)) : q;
}

export async function danhSachKhoanChi(ky?: string) {
  const q = db.select().from(khoanChi).orderBy(desc(khoanChi.ngay), desc(khoanChi.taoLuc));
  return ky ? q.where(eq(khoanChi.ky, ky)) : q;
}

export type TongHop = {
  ky: string;
  tongThu: number;
  tongChi: number;
  lai: number;
  thuDaKeKhai: number;
  thuChuaQuyet: number;
  soDongChuaQuyet: number;
  chiDuocTru: number;
  daKhoa: boolean;
};

/**
 * Tổng hợp một kỳ. Hai con số cạnh nhau là điểm chính của cả mục 1 chiến lược:
 * `tongThu` là doanh thu THẬT, `thuDaKeKhai` là phần đã kê. Chủ trung tâm nhìn
 * thấy cả hai, nên biết lãi thật — thứ hiện giờ không ai nói được.
 */
export async function tongHopKy(ky: string): Promise<TongHop> {
  const [thu] = await db
    .select({
      tong: raw<number>`coalesce(sum(${khoanThu.soTien}), 0)::bigint`,
      daKe: raw<number>`coalesce(sum(${khoanThu.soTien}) filter (where ${khoanThu.dienKeKhai} = 'da_ke_khai'), 0)::bigint`,
      chuaQuyet: raw<number>`coalesce(sum(${khoanThu.soTien}) filter (where ${khoanThu.dienKeKhai} = 'chua_quyet'), 0)::bigint`,
      soChuaQuyet: raw<number>`count(*) filter (where ${khoanThu.dienKeKhai} = 'chua_quyet')::int`,
    })
    .from(khoanThu)
    .where(eq(khoanThu.ky, ky));

  const [chi] = await db
    .select({
      tong: raw<number>`coalesce(sum(${khoanChi.soTien}), 0)::bigint`,
      duocTru: raw<number>`coalesce(sum(${khoanChi.soTien}) filter (where ${khoanChi.duocTru}), 0)::bigint`,
    })
    .from(khoanChi)
    .where(eq(khoanChi.ky, ky));

  const daKhoa = (await cacKyDangKhoa([ky])).length > 0;
  const tongThu = Number(thu?.tong ?? 0);
  const tongChi = Number(chi?.tong ?? 0);

  return {
    ky,
    tongThu,
    tongChi,
    lai: tongThu - tongChi,
    thuDaKeKhai: Number(thu?.daKe ?? 0),
    thuChuaQuyet: Number(thu?.chuaQuyet ?? 0),
    soDongChuaQuyet: Number(thu?.soChuaQuyet ?? 0),
    chiDuocTru: Number(chi?.duocTru ?? 0),
    daKhoa,
  };
}

/** Các kỳ đang có dữ liệu, mới nhất trước. */
export async function cacKyCoDuLieu(): Promise<string[]> {
  const a = await db.selectDistinct({ ky: khoanThu.ky }).from(khoanThu);
  const b = await db.selectDistinct({ ky: khoanChi.ky }).from(khoanChi);
  return [...new Set([...a, ...b].map((r) => r.ky))].sort().reverse();
}

/* ═══════════════════════════════ kỳ kế toán ══════════════════════════════ */

export type DongKy = {
  ky: string;
  trangThai: "mo" | "dang_chot" | "da_khoa";
  khoaLuc: Date | null;
  khoaBoiId: string | null;
  ghiChu: string | null;
  tongHop: TongHop;
};

/** Các kỳ có dữ liệu HOẶC đã có dòng trạng thái, kèm tổng hợp từng kỳ. */
export async function danhSachKy(): Promise<DongKy[]> {
  const coDuLieu = await cacKyCoDuLieu();
  const daGhi = await db.select().from(kyKeToan);
  const tatCa = [...new Set([...coDuLieu, ...daGhi.map((k) => k.ky)])].sort().reverse();
  const theoKy = new Map(daGhi.map((k) => [k.ky, k]));

  return Promise.all(
    tatCa.map(async (ky) => {
      const d = theoKy.get(ky);
      return {
        ky,
        trangThai: (d?.trangThai ?? "mo") as DongKy["trangThai"],
        khoaLuc: d?.khoaLuc ?? null,
        khoaBoiId: d?.khoaBoiId ?? null,
        ghiChu: d?.ghiChu ?? null,
        tongHop: await tongHopKy(ky),
      };
    }),
  );
}

export class ConDongChuaQuyetError extends Error {
  constructor(public soDong: number) {
    super(
      `Còn ${soDong} dòng doanh thu chưa quyết kê khai. Khoá sổ bây giờ là chốt một kỳ ` +
        `mà chính mình chưa biết phần nào sẽ vào tờ khai.`,
    );
    this.name = "ConDongChuaQuyetError";
  }
}

/**
 * Khoá hoặc mở khoá một kỳ.
 *
 * Mở khoá NẶNG HƠN khoá: nó mở lại một kỳ đã chốt và có thể đã nộp tờ khai, nên
 * bắt buộc ghi lý do. Khoá thì chỉ cần một điều kiện — không còn dòng nào
 * `chua_quyet`, vì chốt một kỳ mà chưa biết phần nào sẽ vào tờ khai thì con dấu
 * đó không có nghĩa gì.
 */
export async function datTrangThaiKy(
  ky: string,
  trangThai: DongKy["trangThai"],
  nguoiDungId: string,
  ghiChu?: string | null,
): Promise<DongKy["trangThai"]> {
  if (!laKyHopLe(ky)) throw new Error("Kỳ phải là YYYY-MM.");

  if (trangThai === "da_khoa") {
    const th = await tongHopKy(ky);
    if (th.soDongChuaQuyet > 0) throw new ConDongChuaQuyetError(th.soDongChuaQuyet);
  }
  if (trangThai === "mo" && !ghiChu?.trim()) {
    throw new Error("Mở khoá một kỳ đã chốt thì phải ghi lý do — đây là thứ sẽ bị hỏi lại.");
  }

  const gia = {
    trangThai,
    khoaLuc: trangThai === "da_khoa" ? new Date() : null,
    khoaBoiId: trangThai === "da_khoa" ? nguoiDungId : null,
    ghiChu: ghiChu ?? null,
  };

  // Đổi trạng thái và ghi nhật ký PHẢI cùng sống hoặc cùng chết. Audit bắt được
  // đúng ca ngược lại: trạng thái đã đổi, nhật ký ném lỗi, API báo hỏng — người
  // dùng tưởng chưa khoá trong khi sổ đã khoá rồi.
  await db.transaction(async (tx) => {
    const [cu] = await tx.select().from(kyKeToan).where(eq(kyKeToan.ky, ky)).limit(1);
    if (cu) {
      const [moi] = await tx.update(kyKeToan).set(gia).where(eq(kyKeToan.ky, ky)).returning();
      await ghiNhatKy("ky_ke_toan", moi.ky, "sua", nguoiDungId, cu, moi, tx);
    } else {
      const [moi] = await tx.insert(kyKeToan).values({ ky, ...gia }).returning();
      await ghiNhatKy("ky_ke_toan", moi.ky, "them", nguoiDungId, undefined, moi, tx);
    }
  });
  return trangThai;
}
