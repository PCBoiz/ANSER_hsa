import { describe, expect, it } from "vitest";
import {
  cacKyTrongKhoi,
  docKhoiDan,
  docNgay,
  docSoTien,
  laKyHopLe,
  suyKyTuNgay,
} from "@/server/tinhToan/soThuChi";

/**
 * `docSoTien` là hàm nguy hiểm nhất trong cả sản phẩm tính tới lúc này.
 *
 * Người Việt viết `1.500.000`, JavaScript đọc `"1.500"` thành `1.5`. Sai một
 * dấu chấm là sai số tiền một nghìn lần — mà bảng vẫn cân đối, vẫn không lỗi.
 * Bộ test này dày hơn hẳn các bộ khác đúng vì lý do đó.
 */
describe("docSoTien", () => {
  it("đọc đúng dấu nghìn kiểu Việt", () => {
    expect(docSoTien("1.500.000")).toBe(1_500_000);
    expect(docSoTien("15.000")).toBe(15_000);
    expect(docSoTien("1.500")).toBe(1_500); // KHÔNG phải 1,5
    expect(docSoTien("250.000.000")).toBe(250_000_000);
  });

  it("đọc đúng dấu nghìn kiểu Anh", () => {
    expect(docSoTien("1,500,000")).toBe(1_500_000);
    expect(docSoTien("1,500")).toBe(1_500);
  });

  it("có cả hai dấu thì dấu SAU CÙNG là thập phân", () => {
    expect(docSoTien("1.500.000,50")).toBe(1_500_001); // làm tròn nửa lên
    expect(docSoTien("1,500,000.50")).toBe(1_500_001);
    expect(docSoTien("1.500.000,49")).toBe(1_500_000);
  });

  it("một dấu với 1–2 chữ số phía sau là thập phân", () => {
    expect(docSoTien("1,5")).toBe(2); // 1,5 làm tròn nửa lên
    expect(docSoTien("1,4")).toBe(1);
    expect(docSoTien("2.25")).toBe(2);
  });

  it("bỏ được ký hiệu tiền và khoảng trắng", () => {
    expect(docSoTien("1.500.000đ")).toBe(1_500_000);
    expect(docSoTien(" 1 500 000 ")).toBe(1_500_000);
    expect(docSoTien("1.500.000 VND")).toBe(1_500_000);
    expect(docSoTien("1 500 000")).toBe(1_500_000); // khoảng trắng cứng của Excel
  });

  it("hiểu số âm kiểu kế toán trong ngoặc", () => {
    expect(docSoTien("(1.500.000)")).toBe(-1_500_000);
    expect(docSoTien("-1.500.000")).toBe(-1_500_000);
  });

  it("KHÔNG ĐOÁN khi không chắc — trả null", () => {
    for (const x of ["", "  ", "abc", "1.2.3.4a", "12/07/2026", "-", "đ"]) {
      expect(docSoTien(x), `"${x}" phải trả null`).toBeNull();
    }
  });

  it("chặn nhóm dấu nghìn sai cấu trúc — đây là chỗ test bắt được lỗi thật", () => {
    // "1,5," từng ra 15: hai dấu phẩy bị coi là dấu nghìn, bóc đi rồi ghép lại
    // thành một con số hoàn toàn bịa từ đầu vào hỏng.
    for (const x of ["1,5,", "1.50.000", "1.5000", ",500", "1..500", "1.500.00"]) {
      expect(docSoTien(x), `"${x}" phải trả null`).toBeNull();
    }
  });

  it("số nguyên trần vẫn đúng", () => {
    expect(docSoTien("0")).toBe(0);
    expect(docSoTien("1500000")).toBe(1_500_000);
  });
});

describe("docNgay", () => {
  it("nhận các kiểu viết thường gặp", () => {
    expect(docNgay("15/07/2026")).toBe("2026-07-15");
    expect(docNgay("15-7-2026")).toBe("2026-07-15");
    expect(docNgay("2026-07-15")).toBe("2026-07-15");
    expect(docNgay("15.7.2026")).toBe("2026-07-15");
    expect(docNgay("5/7/26")).toBe("2026-07-05");
  });

  it("LUÔN hiểu là ngày/tháng, không phải tháng/ngày", () => {
    // Chọn sai quy ước này thì mọi giao dịch trong 12 ngày đầu mỗi tháng rơi
    // nhầm kỳ — sai âm thầm, không có lỗi nào.
    expect(docNgay("05/07/2026")).toBe("2026-07-05");
    expect(docNgay("07/05/2026")).toBe("2026-05-07");
  });

  it("chặn ngày không tồn tại", () => {
    expect(docNgay("31/02/2026")).toBeNull();
    expect(docNgay("32/01/2026")).toBeNull();
    expect(docNgay("15/13/2026")).toBeNull();
  });

  it("chặn rác", () => {
    for (const x of ["", "hôm qua", "2026", "15/07"]) expect(docNgay(x)).toBeNull();
  });
});

describe("suyKyTuNgay và laKyHopLe", () => {
  it("kỳ luôn suy từ ngày, không gõ tay", () => {
    expect(suyKyTuNgay("2026-07-15")).toBe("2026-07");
    expect(suyKyTuNgay("2026-01-01")).toBe("2026-01");
  });

  it("ngày hỏng thì không có kỳ", () => {
    expect(suyKyTuNgay("15/07/2026")).toBeNull();
    expect(suyKyTuNgay("2026-13-01")).toBeNull();
  });

  it("kỳ hợp lệ đúng như CHECK ở tầng DB", () => {
    expect(laKyHopLe("2026-07")).toBe(true);
    expect(laKyHopLe("2026-7")).toBe(false);
    expect(laKyHopLe("T7/2026")).toBe(false);
    expect(laKyHopLe("2026-13")).toBe(false);
    expect(laKyHopLe("1999-01")).toBe(false);
  });
});

describe("docKhoiDan", () => {
  it("đọc khối ba cột dán từ Excel", () => {
    const kq = docKhoiDan(
      "15/07/2026\t1.500.000\tHọc phí Toán T7\n" + "20/07/2026\t800.000\tBán tài liệu",
    );
    expect(kq.loi).toEqual([]);
    expect(kq.dong).toHaveLength(2);
    expect(kq.dong[0]).toMatchObject({ ngay: "2026-07-15", ky: "2026-07", soTien: 1_500_000 });
    expect(kq.dong[1].moTa).toBe("Bán tài liệu");
  });

  it("bỏ qua dòng tiêu đề mà không báo lỗi", () => {
    const kq = docKhoiDan("Ngày\tSố tiền\tDiễn giải\n15/07/2026\t1.500.000\tHọc phí");
    expect(kq.loi).toEqual([]);
    expect(kq.dong).toHaveLength(1);
  });

  it("trả về TỪNG dòng hỏng kèm lý do, không bỏ cả khối", () => {
    const kq = docKhoiDan(
      "15/07/2026\t1.500.000\tổn\n" +
        "hôm qua\t500.000\tngày hỏng\n" +
        "16/07/2026\tabc\tsố hỏng\n" +
        "17/07/2026\t2.000.000\tổn",
    );
    expect(kq.dong).toHaveLength(2);
    expect(kq.loi).toHaveLength(2);
    expect(kq.loi[0].dong).toBe(2);
    expect(kq.loi[0].ly).toContain("ngày");
    expect(kq.loi[1].dong).toBe(3);
    expect(kq.loi[1].ly).toContain("số tiền");
  });

  it("chặn số tiền bằng 0 hoặc âm", () => {
    const kq = docKhoiDan("15/07/2026\t0\tkhông\n16/07/2026\t(500.000)\tâm");
    expect(kq.dong).toHaveLength(0);
    expect(kq.loi).toHaveLength(2);
  });

  it("thiếu cột mô tả vẫn đọc được", () => {
    const kq = docKhoiDan("15/07/2026\t1.500.000");
    expect(kq.dong[0].moTa).toBe("");
    expect(kq.loi).toEqual([]);
  });

  it("một cột thì báo lỗi chứ không đoán", () => {
    const kq = docKhoiDan("15/07/2026");
    expect(kq.dong).toHaveLength(0);
    expect(kq.loi[0].ly).toContain("hai cột");
  });

  it("giữ nguyên văn từng cột để người dùng đối chiếu", () => {
    const kq = docKhoiDan("15/07/2026\t1.500.000\tHọc phí");
    expect(kq.dong[0].cot).toEqual(["15/07/2026", "1.500.000", "Học phí"]);
  });
});

describe("cacKyTrongKhoi", () => {
  it("liệt kê các kỳ để kiểm kỳ nào đã khoá trước khi ghi", () => {
    const { dong } = docKhoiDan(
      "15/06/2026\t100.000\ta\n20/07/2026\t200.000\tb\n25/07/2026\t300.000\tc",
    );
    expect(cacKyTrongKhoi(dong)).toEqual(["2026-06", "2026-07"]);
  });
});
