import { describe, expect, it } from "vitest";
import { kiemTraDaiBac } from "@/server/tinhToan/bacThue";

/**
 * Biểu thuế thiếu một khoảng nghĩa là có mức thu nhập không tra được thuế suất.
 * Nếu chỗ đó im lặng trả 0 thì bảng lương vẫn ra một con số, vẫn cân đối, và
 * vẫn sai. Bộ test này giữ cho cái hở đó luôn ồn ào.
 */
describe("kiemTraDaiBac", () => {
  it("bảng rỗng là chưa đủ, không phải là hợp lệ", () => {
    expect(kiemTraDaiBac([])).toEqual({ du: false, thieu: ["chưa có bậc nào"] });
  });

  it("nhận biểu phủ liền mạch từ 0 tới vô cực", () => {
    const kq = kiemTraDaiBac([
      { bac: 1, tuThuNhap: 0, denThuNhap: 10_000_000 },
      { bac: 2, tuThuNhap: 10_000_000, denThuNhap: 30_000_000 },
      { bac: 3, tuThuNhap: 30_000_000, denThuNhap: 100_000_000 },
      { bac: 4, tuThuNhap: 100_000_000, denThuNhap: null },
    ]);
    expect(kq.du).toBe(true);
    expect(kq.thieu).toEqual([]);
  });

  it("bắt được lỗ hổng giữa hai bậc", () => {
    const kq = kiemTraDaiBac([
      { bac: 1, tuThuNhap: 0, denThuNhap: 10_000_000 },
      { bac: 2, tuThuNhap: 30_000_000, denThuNhap: null },
    ]);
    expect(kq.du).toBe(false);
    expect(kq.thieu).toContain("hở từ 10000000 tới 30000000");
  });

  it("bắt được biểu không bắt đầu từ 0", () => {
    const kq = kiemTraDaiBac([{ bac: 1, tuThuNhap: 5_000_000, denThuNhap: null }]);
    expect(kq.du).toBe(false);
    expect(kq.thieu).toContain("hở từ 0 tới 5000000");
  });

  it("bắt được bậc cuối có trần — thu nhập trên trần sẽ không tra được thuế suất", () => {
    const kq = kiemTraDaiBac([{ bac: 1, tuThuNhap: 0, denThuNhap: 10_000_000 }]);
    expect(kq.du).toBe(false);
    expect(kq.thieu).toContain("bậc cuối phải không có trần");
  });

  it("không phụ thuộc thứ tự dòng trả về từ DB", () => {
    const xuoi = kiemTraDaiBac([
      { bac: 1, tuThuNhap: 0, denThuNhap: 10_000_000 },
      { bac: 2, tuThuNhap: 10_000_000, denThuNhap: null },
    ]);
    const nguoc = kiemTraDaiBac([
      { bac: 2, tuThuNhap: 10_000_000, denThuNhap: null },
      { bac: 1, tuThuNhap: 0, denThuNhap: 10_000_000 },
    ]);
    expect(nguoc).toEqual(xuoi);
  });

  it("chịu được giá trị numeric trả về dạng chuỗi từ Postgres", () => {
    // Cột bigint/numeric của Postgres về JS là chuỗi. So sánh không ép kiểu sẽ
    // báo hở ở mọi ranh giới — lỗi trông y hệt biểu thuế sai.
    const kq = kiemTraDaiBac([
      { bac: 1, tuThuNhap: "0", denThuNhap: "10000000" },
      { bac: 2, tuThuNhap: "10000000", denThuNhap: null },
    ]);
    expect(kq.du).toBe(true);
  });

  it("BIỂU ĐANG NẠP THẬT CHƯA ĐỦ — xoá test này khi tra xong 3 bậc giữa", () => {
    // Mới tra được bậc 1 (0–10tr, 5%) và bậc 5 (trên 100tr, 35%).
    const dangCo = kiemTraDaiBac([
      { bac: 1, tuThuNhap: 0, denThuNhap: 10_000_000 },
      { bac: 5, tuThuNhap: 100_000_000, denThuNhap: null },
    ]);
    expect(dangCo.du).toBe(false);
  });
});
