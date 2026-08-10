import { eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { caiDatCongTy } from "@/server/db/schema";
import { ghiNhatKy } from "@/server/store/nhatKy";

/** Singleton — luôn chỉ có đúng một dòng. */
export async function baoDamDongCaiDat() {
  const rows = await db.select().from(caiDatCongTy).limit(1);
  if (rows[0]) return rows[0];
  const tao = await db.insert(caiDatCongTy).values({ ten: "ANSER-HSA" }).returning();
  return tao[0];
}

export async function layCaiDatCongTy() {
  return baoDamDongCaiDat();
}

export async function capNhatCaiDatCongTy(
  patch: Partial<{
    ten: string;
    diaChi: string | null;
    dienThoai: string | null;
    email: string | null;
    maSoThue: string | null;
    vungLuongToiThieu: number;
    khaiThueTheo: string;
  }>,
  nguoiDungId: string | null = null,
) {
  if (patch.vungLuongToiThieu !== undefined && ![1, 2, 3, 4].includes(patch.vungLuongToiThieu)) {
    throw new Error("Vùng lương tối thiểu phải là 1, 2, 3 hoặc 4.");
  }
  const hienTai = await baoDamDongCaiDat();
  return db.transaction(async (tx) => {
    const rows = await tx
      .update(caiDatCongTy)
      .set({ ...patch, capNhatLuc: new Date() })
      .where(eq(caiDatCongTy.id, hienTai.id))
      .returning();
    // Vùng lương tối thiểu quyết định sàn đóng BHXH; chu kỳ khai thuế quyết định
    // mọi mốc trong lịch nghĩa vụ. Đổi hai thứ này là đổi kết quả của mọi bảng
    // tính sau đó — phải biết ai đổi, từ gì sang gì.
    if (patch.vungLuongToiThieu !== undefined || patch.khaiThueTheo !== undefined) {
      await ghiNhatKy("cai_dat_cong_ty", hienTai.id, "sua", nguoiDungId, hienTai, rows[0], tx);
    }
    return rows[0];
  });
}
