import { desc, eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { quyTacTuDong } from "@/server/db/schema";

export type QuyTac = typeof quyTacTuDong.$inferSelect;

/**
 * Năm loại quy tắc của HSA. Không loại nào TÍNH gì cả — n8n gọi endpoint thuần
 * để hỏi "hôm nay phải nhắc ai", rồi mang câu trả lời đi gửi. Hạn nộp, số tiền,
 * ai còn nợ đều là kết quả của hàm có test, không phải của một node `code`.
 */
export const LOAI_QUY_TAC = [
  "nhac_han_nghia_vu",
  "nhac_hoc_phi",
  "nhac_ho_so_tt29",
  "nhac_cam_ket_08",
  "bao_cao_thang",
] as const;
export type LoaiQuyTac = (typeof LOAI_QUY_TAC)[number];

export const NHAN_LOAI: Record<LoaiQuyTac, string> = {
  nhac_han_nghia_vu: "Nhắc hạn nộp thuế, BHXH",
  nhac_hoc_phi: "Nhắc học phí đến hạn",
  nhac_ho_so_tt29: "Nhắc hồ sơ TT29 còn thiếu",
  nhac_cam_ket_08: "Nhắc giáo viên nộp cam kết 08",
  bao_cao_thang: "Báo cáo cuối tháng cho chủ trung tâm",
};

export async function danhSachQuyTac() {
  return db.select().from(quyTacTuDong).orderBy(desc(quyTacTuDong.taoLuc));
}

export async function timQuyTac(id: string): Promise<QuyTac | undefined> {
  const rows = await db.select().from(quyTacTuDong).where(eq(quyTacTuDong.id, id)).limit(1);
  return rows[0];
}

export async function taoQuyTac(input: {
  ten: string;
  loai: LoaiQuyTac;
  bat?: boolean;
  n8nWorkflowId?: string;
}) {
  if (!LOAI_QUY_TAC.includes(input.loai)) throw new Error(`Loại quy tắc không hợp lệ: ${input.loai}`);
  const rows = await db
    .insert(quyTacTuDong)
    .values({
      ten: input.ten,
      loai: input.loai,
      bat: input.bat ?? true,
      n8nWorkflowId: input.n8nWorkflowId,
    })
    .returning();
  return rows[0];
}

export async function capNhatQuyTac(
  id: string,
  patch: Partial<{ ten: string; bat: boolean; n8nWorkflowId: string | null }>,
) {
  const rows = await db.update(quyTacTuDong).set(patch).where(eq(quyTacTuDong.id, id)).returning();
  return rows[0];
}

export async function xoaQuyTac(id: string) {
  await db.delete(quyTacTuDong).where(eq(quyTacTuDong.id, id));
}

export async function ghiLanChay(id: string, trangThai: string) {
  await db
    .update(quyTacTuDong)
    .set({ chayLanCuoi: new Date(), trangThaiLanCuoi: trangThai })
    .where(eq(quyTacTuDong.id, id));
}
