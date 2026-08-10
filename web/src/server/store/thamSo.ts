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
];

/**
 * Biểu thuế luỹ tiến 2026 — 5 bậc, giảm từ 7.
 *
 * ⚠️ MỚI TRA ĐƯỢC HAI BẬC ĐẦU VÀ CUỐI. Ba bậc giữa chưa có nguồn xác nhận, nên
 * KHÔNG điền. Điền bừa ở đây là sai số thuế của từng giáo viên từng tháng, và
 * đó đúng loại lỗi không ai phát hiện tới lúc quyết toán.
 *
 * `kiemTraBacThue()` sẽ báo bảng chưa đủ, và tool tính lương phải từ chối chạy.
 */
const BAC_THUE: Array<{
  bac: number;
  tuThuNhap: number;
  denThuNhap: number | null;
  thueSuat: string;
}> = [
  { bac: 1, tuThuNhap: 0, denThuNhap: 10_000_000, thueSuat: "5" },
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
