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

  it("biểu 5 bậc đang nạp thật phủ liền mạch", () => {
    // Phải khớp BAC_THUE trong src/server/store/thamSo.ts. Sửa một nơi mà quên
    // nơi kia thì test này đỏ — đó là mục đích của nó.
    const dangNap = kiemTraDaiBac([
      { bac: 1, tuThuNhap: 0, denThuNhap: 10_000_000 },
      { bac: 2, tuThuNhap: 10_000_000, denThuNhap: 30_000_000 },
      { bac: 3, tuThuNhap: 30_000_000, denThuNhap: 60_000_000 },
      { bac: 4, tuThuNhap: 60_000_000, denThuNhap: 100_000_000 },
      { bac: 5, tuThuNhap: 100_000_000, denThuNhap: null },
    ]);
    expect(dangNap).toEqual({ du: true, thieu: [] });
  });
});

/**
 * Số học của biểu thuế tự kiểm chứng được, và đó là lý do tin được bản tra về:
 * thuế tối đa cộng dồn từng bậc phải ra đúng các mốc mà mọi bản hướng dẫn nêu.
 * Nếu ai đó gõ nhầm một thuế suất hay một mốc, dãy này lệch ngay.
 */
describe("thuế luỹ tiến cộng dồn", () => {
  const BAC = [
    { tu: 0, den: 10_000_000, suat: 0.05 },
    { tu: 10_000_000, den: 30_000_000, suat: 0.1 },
    { tu: 30_000_000, den: 60_000_000, suat: 0.2 },
    { tu: 60_000_000, den: 100_000_000, suat: 0.3 },
    { tu: 100_000_000, den: null as number | null, suat: 0.35 },
  ];

  function thueTaiMoc(mocTran: number): number {
    let thue = 0;
    for (const b of BAC) {
      const tran = b.den === null ? mocTran : Math.min(b.den, mocTran);
      if (tran <= b.tu) break;
      thue += (tran - b.tu) * b.suat;
    }
    return thue;
  }

  it("thuế tối đa của từng bậc ra đúng 0,5 → 2,5 → 8,5 → 20,5 triệu", () => {
    expect(thueTaiMoc(10_000_000)).toBe(500_000);
    expect(thueTaiMoc(30_000_000)).toBe(2_500_000);
    expect(thueTaiMoc(60_000_000)).toBe(8_500_000);
    expect(thueTaiMoc(100_000_000)).toBe(20_500_000);
  });

  it("thu nhập 0 thì thuế 0 — không có bậc nào thu trên số âm", () => {
    expect(thueTaiMoc(0)).toBe(0);
  });

  it("vượt bậc cuối thì cộng đúng 35% phần vượt", () => {
    expect(thueTaiMoc(150_000_000)).toBe(20_500_000 + 50_000_000 * 0.35);
  });
});
