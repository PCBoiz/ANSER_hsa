import { eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { caiDatCongTy } from "@/server/db/schema";

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
  }>,
) {
  if (patch.vungLuongToiThieu !== undefined && ![1, 2, 3, 4].includes(patch.vungLuongToiThieu)) {
    throw new Error("Vùng lương tối thiểu phải là 1, 2, 3 hoặc 4.");
  }
  const hienTai = await baoDamDongCaiDat();
  const rows = await db
    .update(caiDatCongTy)
    .set({ ...patch, capNhatLuc: new Date() })
    .where(eq(caiDatCongTy.id, hienTai.id))
    .returning();
  return rows[0];
}
