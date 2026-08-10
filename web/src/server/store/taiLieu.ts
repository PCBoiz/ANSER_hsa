import { createHash } from "node:crypto";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/server/db/client";
import { taiLieu } from "@/server/db/schema";
import { ghiNhatKy } from "@/server/store/nhatKy";
import {
  duongDanKho,
  vaiTroToiThieuXem,
  type LoaiTaiLieu,
  LOAI_TAI_LIEU,
} from "@/server/tinhToan/taiLieu";
import type { VaiTro } from "@/server/store/users";

export type TaiLieu = typeof taiLieu.$inferSelect;

export function bamNoiDung(noiDung: Uint8Array): string {
  return createHash("sha256").update(noiDung).digest("hex");
}

/**
 * Dựng đường dẫn cho một file SẮP được đẩy lên, chưa ghi sổ.
 *
 * Sinh `id` ở đây để đường dẫn trên kho và khoá chính là một — nhưng KHÔNG ghi
 * bản ghi. Bản ghi chỉ ra đời ở bước xác nhận, sau khi server đã tự hỏi R2 xem
 * file có thật không. Nhờ vậy sổ không bao giờ có dòng trỏ vào hư không.
 *
 * Đổi lại: trình duyệt đẩy xong rồi tắt tab thì R2 còn một object không bản ghi
 * nào trỏ tới. Nó vô hình và chỉ tốn vài KB; dọn được bằng một lượt đối chiếu
 * khoá trên R2 với cột `duong_dan`, chưa làm.
 */
export function dungDuongDan(input: { ten: string; loai: LoaiTaiLieu; ky: string | null }) {
  const id = crypto.randomUUID();
  return { id, duongDan: duongDanKho({ loai: input.loai, ky: input.ky, id, ten: input.ten }) };
}

/** Loại tài liệu một vai trò được phép nhìn thấy. Lọc ở tầng truy vấn, không ở UI. */
export function loaiDuocXem(vaiTro: VaiTro): LoaiTaiLieu[] {
  const thuTu: VaiTro[] = ["tro_giang", "ke_toan", "quan_ly", "admin"];
  const capCoi = thuTu.indexOf(vaiTro);
  return LOAI_TAI_LIEU.filter((l) => capCoi >= thuTu.indexOf(vaiTroToiThieuXem(l)));
}

export async function danhSachTaiLieu(vaiTro: VaiTro, loc?: { loai?: LoaiTaiLieu; ky?: string }) {
  const duoc = loaiDuocXem(vaiTro);
  if (duoc.length === 0) return [];

  const dieuKien = [inArray(taiLieu.loai, loc?.loai ? [loc.loai] : duoc)];
  if (loc?.loai && !duoc.includes(loc.loai)) return [];
  if (loc?.ky) dieuKien.push(eq(taiLieu.ky, loc.ky));

  return db
    .select()
    .from(taiLieu)
    .where(and(...dieuKien))
    .orderBy(desc(taiLieu.taoLuc));
}

export async function timTaiLieu(id: string): Promise<TaiLieu | undefined> {
  const rows = await db.select().from(taiLieu).where(eq(taiLieu.id, id)).limit(1);
  return rows[0];
}

/** Tải lại đúng file cũ thì trả về bản ghi đã có, không nhân đôi kho. */
export async function timTheoBam(bam: string): Promise<TaiLieu | undefined> {
  const rows = await db.select().from(taiLieu).where(eq(taiLieu.bamNoiDung, bam)).limit(1);
  return rows[0];
}

export async function ghiTaiLieu(input: {
  id?: string;
  duongDan?: string;
  ten: string;
  loai: LoaiTaiLieu;
  ky: string | null;
  dinhDang: string | null;
  kichThuoc: number;
  bamNoiDung: string;
  nguoiTaiLenId: string;
  ghiChu?: string | null;
  nguon?: "mau" | "that";
}): Promise<{ ban: TaiLieu; duongDan: string }> {
  const id = input.id ?? crypto.randomUUID();
  const duongDan =
    input.duongDan ?? duongDanKho({ loai: input.loai, ky: input.ky, id, ten: input.ten });

  const rows = await db
    .insert(taiLieu)
    .values({
      id,
      ten: input.ten,
      loai: input.loai,
      ky: input.ky,
      duongDan,
      dinhDang: input.dinhDang,
      kichThuoc: input.kichThuoc,
      bamNoiDung: input.bamNoiDung,
      nguoiTaiLenId: input.nguoiTaiLenId,
      ghiChu: input.ghiChu ?? null,
      nguon: input.nguon ?? "that",
    })
    .returning();

  return { ban: rows[0], duongDan };
}

export async function xoaTaiLieu(id: string, nguoiDungId: string | null = null) {
  const [cu] = await db.select().from(taiLieu).where(eq(taiLieu.id, id)).limit(1);
  await db.transaction(async (tx) => {
    await tx.delete(taiLieu).where(eq(taiLieu.id, id));
    // Chỉ ghi khi người thật xoá một tài liệu đã có. Lúc dọn bản ghi mồ côi vì
    // đẩy file hỏng thì không truyền người vào — dòng đó không nói gì về hành vi.
    if (cu && nguoiDungId) await ghiNhatKy("tai_lieu", id, "xoa", nguoiDungId, cu, undefined, tx);
  });
}
