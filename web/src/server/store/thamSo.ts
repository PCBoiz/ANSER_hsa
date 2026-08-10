/**
 * Tham số pháp lý — nguồn duy nhất cho mọi con số do luật quy định.
 *
 * Không con số nào trong nhóm này được viết thẳng vào code. Chỉ trong nửa đầu
 * 2026 đã đổi: giảm trừ gia cảnh lên 15,5 triệu, biểu thuế từ 7 bậc xuống 5,
 * lương tối thiểu vùng làm căn cứ đóng BHXH đổi từ 01/01. Ngưỡng khấu trừ 10%
 * đang có dự thảo nâng lên, với hai con số khác nhau đang lưu hành.
 *
 * Mọi giá trị dưới đây đã TRA NGUỒN ngày 10/08/2026, có ghi văn bản. Chỗ nào
 * chưa tra được thì KHÔNG có dòng — và `kiemTraBacThue()` sẽ chặn.
 */

import { and, desc, eq, isNull, lte, or, gt } from "drizzle-orm";
import { db } from "@/server/db/client";
import { bacThueTncn, thamSoPhapLy } from "@/server/db/schema";
import { kiemTraDaiBac, type KetQuaKiemTra } from "@/server/tinhToan/bacThue";

export { kiemTraDaiBac } from "@/server/tinhToan/bacThue";
export type { DaiBac, KetQuaKiemTra } from "@/server/tinhToan/bacThue";

type DongThamSo = {
  ma: string;
  giaTri: string;
  donVi: "vnd" | "phan_tram" | "lan";
  hieuLucTu: string;
  hieuLucDen?: string;
  nguonVanBan: string;
  ghiChu?: string;
};

const THAM_SO: DongThamSo[] = [
  {
    ma: "nguong_khau_tru_tncn_10",
    giaTri: "2000000",
    donVi: "vnd",
    hieuLucTu: "2013-10-01",
    nguonVanBan: "Điểm i khoản 1 Điều 25 Thông tư 111/2013/TT-BTC",
    ghiChu:
      "Áp cho cá nhân cư trú không ký HĐLĐ hoặc HĐLĐ dưới 3 tháng. Đang có dự thảo nâng ngưỡng; " +
      "hai con số lưu hành trong các bản dự thảo khác nhau là 3 triệu và 5 triệu. CHƯA BAN HÀNH — " +
      "khi ban hành thì thêm một dòng mới, không sửa dòng này.",
  },
  {
    ma: "giam_tru_gia_canh_ban_than",
    giaTri: "15500000",
    donVi: "vnd",
    hieuLucTu: "2026-01-01",
    nguonVanBan: "Mức giảm trừ gia cảnh mới, áp dụng từ kỳ tính thuế 2026",
    ghiChu: "Tương đương 186 triệu/năm.",
  },
  {
    ma: "giam_tru_gia_canh_phu_thuoc",
    giaTri: "6200000",
    donVi: "vnd",
    hieuLucTu: "2026-01-01",
    nguonVanBan: "Mức giảm trừ gia cảnh mới, áp dụng từ kỳ tính thuế 2026",
    ghiChu: "Tương đương 74,4 triệu/năm mỗi người phụ thuộc.",
  },
  {
    ma: "luong_toi_thieu_vung_1",
    giaTri: "5310000",
    donVi: "vnd",
    hieuLucTu: "2026-01-01",
    nguonVanBan: "BHXH Việt Nam — mức lương tối thiểu làm căn cứ đóng BHXH bắt buộc từ 01/01/2026",
    ghiChu: "Hà Nội nội thành thuộc vùng I. Lương đóng BHXH không được thấp hơn mức này.",
  },
  { ma: "luong_toi_thieu_vung_2", giaTri: "4730000", donVi: "vnd", hieuLucTu: "2026-01-01",
    nguonVanBan: "BHXH Việt Nam — căn cứ đóng BHXH bắt buộc từ 01/01/2026" },
  { ma: "luong_toi_thieu_vung_3", giaTri: "4140000", donVi: "vnd", hieuLucTu: "2026-01-01",
    nguonVanBan: "BHXH Việt Nam — căn cứ đóng BHXH bắt buộc từ 01/01/2026" },
  { ma: "luong_toi_thieu_vung_4", giaTri: "3700000", donVi: "vnd", hieuLucTu: "2026-01-01",
    nguonVanBan: "BHXH Việt Nam — căn cứ đóng BHXH bắt buộc từ 01/01/2026" },
  {
    ma: "ty_le_bhxh_nguoi_lao_dong",
    giaTri: "10.5",
    donVi: "phan_tram",
    hieuLucTu: "2026-01-01",
    nguonVanBan: "Tỷ lệ đóng BHXH · BHYT · BHTN 2026",
    ghiChu: "Gộp cả ba khoản phía người lao động.",
  },
  {
    ma: "ty_le_bhxh_doanh_nghiep",
    giaTri: "22",
    donVi: "phan_tram",
    hieuLucTu: "2026-01-01",
    nguonVanBan: "Tỷ lệ đóng BHXH · BHYT · BHTN 2026",
    ghiChu: "Gộp cả BHXH, BHYT, BHTN và bảo hiểm tai nạn lao động. Tổng hai phía 32,5%.",
  },
  {
    ma: "luong_co_so",
    giaTri: "2340000",
    donVi: "vnd",
    hieuLucTu: "2024-07-01",
    hieuLucDen: "2026-07-01",
    nguonVanBan: "Nghị định 73/2024/NĐ-CP",
    ghiChu: "Dùng để tính trần đóng BHXH và BHYT (20 lần). Hết hiệu lực 30/06/2026.",
  },
  {
    ma: "luong_co_so",
    giaTri: "2530000",
    donVi: "vnd",
    hieuLucTu: "2026-07-01",
    nguonVanBan: "Mức lương cơ sở / mức tham chiếu áp dụng từ 01/07/2026",
    ghiChu:
      "Trần đóng BHXH, BHYT = 20 lần = 50.600.000đ/tháng. Đây là ví dụ sống cho việc " +
      "vì sao tham số phải có ngày hiệu lực: cùng năm 2026 có HAI mức, bảng lương " +
      "tháng 6 và tháng 7 phải dùng hai con số khác nhau.",
  },
  {
    ma: "he_so_tran_dong_bhxh",
    giaTri: "20",
    donVi: "lan",
    hieuLucTu: "2026-01-01",
    nguonVanBan: "Trần đóng BHXH, BHYT = 20 lần mức lương cơ sở / mức tham chiếu",
  },
  {
    ma: "he_so_tran_dong_bhtn",
    giaTri: "20",
    donVi: "lan",
    hieuLucTu: "2026-01-01",
    nguonVanBan: "Trần đóng BHTN = 20 lần mức lương tối thiểu vùng nơi doanh nghiệp hoạt động",
    ghiChu: "Khác BHXH/BHYT: nhân với lương TỐI THIỂU VÙNG, không phải lương cơ sở.",
  },
];

/**
 * Biểu thuế luỹ tiến 2026 — 5 bậc, giảm từ 7, áp dụng từ kỳ tính thuế 2026.
 *
 * Tra nguồn 10/08/2026. Số học tự kiểm chứng được, và đó là lý do tin được:
 * thuế tối đa cộng dồn của từng bậc ra đúng 0,5 → 2,5 → 8,5 → 20,5 triệu như
 * các bản hướng dẫn nêu.
 *   bậc 1: 10tr × 5%              = 0,5tr
 *   bậc 2: 0,5 + 20tr × 10%       = 2,5tr
 *   bậc 3: 2,5 + 30tr × 20%       = 8,5tr
 *   bậc 4: 8,5 + 40tr × 30%       = 20,5tr
 *
 * `daDuyet` để false: máy tra về, chưa có kế toán thật nhìn.
 */
const BAC_THUE: Array<{
  bac: number;
  tuThuNhap: number;
  denThuNhap: number | null;
  thueSuat: string;
}> = [
  { bac: 1, tuThuNhap: 0, denThuNhap: 10_000_000, thueSuat: "5" },
  { bac: 2, tuThuNhap: 10_000_000, denThuNhap: 30_000_000, thueSuat: "10" },
  { bac: 3, tuThuNhap: 30_000_000, denThuNhap: 60_000_000, thueSuat: "20" },
  { bac: 4, tuThuNhap: 60_000_000, denThuNhap: 100_000_000, thueSuat: "30" },
  { bac: 5, tuThuNhap: 100_000_000, denThuNhap: null, thueSuat: "35" },
];

const NGUON_BAC_THUE = "Biểu thuế TNCN luỹ tiến từng phần 2026 (5 bậc), từ kỳ tính thuế 2026";
const HIEU_LUC_BAC_THUE = "2026-01-01";

/** Idempotent — chạy lại không nhân đôi, nhờ ràng buộc (ma, hieu_luc_tu). */
export async function gieoThamSoPhapLy() {
  for (const d of THAM_SO) {
    await db.insert(thamSoPhapLy).values(d).onConflictDoNothing();
  }
  for (const b of BAC_THUE) {
    await db
      .insert(bacThueTncn)
      .values({ ...b, hieuLucTu: HIEU_LUC_BAC_THUE, nguonVanBan: NGUON_BAC_THUE })
      .onConflictDoNothing();
  }
}

/** Tool tính lương gọi hàm này trước; `du === false` thì dừng, không đoán. */
export async function kiemTraBacThue(ngay = new Date()): Promise<KetQuaKiemTra> {
  const ngayStr = ngay.toISOString().slice(0, 10);
  const bac = await db
    .select()
    .from(bacThueTncn)
    .where(
      and(
        lte(bacThueTncn.hieuLucTu, ngayStr),
        or(isNull(bacThueTncn.hieuLucDen), gt(bacThueTncn.hieuLucDen, ngayStr)),
      ),
    )
    .orderBy(bacThueTncn.tuThuNhap);

  return kiemTraDaiBac(bac);
}

/**
 * Bao nhiêu con số pháp lý chưa có người rà.
 *
 * Bảng tính nào đọc tham số chưa duyệt thì phải đóng dấu "chưa kế toán rà" —
 * một bảng lương sai vì tra nhầm số trông giống hệt một bảng lương đúng, và
 * đó chính là rủi ro §6 xếp mức Cao.
 */
export async function demChuaDuyet(): Promise<{ thamSo: number; bacThue: number }> {
  const a = await db.select().from(thamSoPhapLy).where(eq(thamSoPhapLy.daDuyet, false));
  const b = await db.select().from(bacThueTncn).where(eq(bacThueTncn.daDuyet, false));
  return { thamSo: a.length, bacThue: b.length };
}

/** Giá trị của một tham số tại một thời điểm. `undefined` = chưa có, KHÔNG phải 0. */
export async function layThamSo(ma: string, ngay = new Date()): Promise<number | undefined> {
  const ngayStr = ngay.toISOString().slice(0, 10);
  const rows = await db
    .select()
    .from(thamSoPhapLy)
    .where(
      and(
        eq(thamSoPhapLy.ma, ma),
        lte(thamSoPhapLy.hieuLucTu, ngayStr),
        or(isNull(thamSoPhapLy.hieuLucDen), gt(thamSoPhapLy.hieuLucDen, ngayStr)),
      ),
    )
    .orderBy(desc(thamSoPhapLy.hieuLucTu))
    .limit(1);
  return rows[0] ? Number(rows[0].giaTri) : undefined;
}
