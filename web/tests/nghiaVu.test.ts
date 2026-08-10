import { describe, expect, it } from "vitest";
import { lichNghiaVu, quaHan, sapToiHan, type NghiaVu } from "@/server/tinhToan/nghiaVu";

const thang = (tu: string, n = 120) => lichNghiaVu(tu, n, { khaiTheo: "thang", coBhxh: true });
const quy = (tu: string, n = 120) => lichNghiaVu(tu, n, { khaiTheo: "quy", coBhxh: false });
const tim = (ds: NghiaVu[], loai: string, ky: string) => ds.find((n) => n.loai === loai && n.ky === ky);

describe("lichNghiaVu — khai theo tháng", () => {
  it("GTGT tháng 7 hạn ngày 20 tháng 8", () => {
    const n = tim(thang("2026-08-01"), "gtgt", "2026-07")!;
    expect(n.hanGoc).toBe("2026-08-20");
    expect(n.canCu).toContain("ngày 20 tháng sau");
  });

  it("TNCN khấu trừ cùng hạn với GTGT khi khai theo tháng", () => {
    const ds = thang("2026-08-01");
    expect(tim(ds, "tncn_khau_tru", "2026-07")!.han).toBe(tim(ds, "gtgt", "2026-07")!.han);
  });

  it("tháng 12 thì hạn rơi sang tháng 1 năm sau", () => {
    const n = tim(thang("2026-12-15", 60), "gtgt", "2026-12")!;
    expect(n.hanGoc).toBe("2027-01-20");
  });
});

describe("lichNghiaVu — khai theo quý", () => {
  it("quý 2 hạn ngày cuối tháng 7", () => {
    const n = tim(quy("2026-07-01"), "gtgt", "Q2/2026")!;
    expect(n.hanGoc).toBe("2026-07-31");
  });

  it("quý 1 hạn ngày cuối tháng 4", () => {
    const n = tim(quy("2026-04-01"), "gtgt", "Q1/2026")!;
    expect(n.hanGoc).toBe("2026-04-30");
  });

  it("quý 4 hạn rơi sang tháng 1 năm sau", () => {
    const n = tim(quy("2026-12-01", 90), "gtgt", "Q4/2026")!;
    expect(n.hanGoc).toBe("2027-01-31");
  });

  it("khai theo quý thì KHÔNG có mốc theo tháng", () => {
    expect(quy("2026-07-01").some((n) => n.loai === "gtgt" && n.ky.startsWith("2026-0"))).toBe(false);
  });
});

describe("lichNghiaVu — BHXH", () => {
  it("BHXH tháng 7 hạn ngày cuối tháng 8, không phải ngày 20", () => {
    const n = tim(thang("2026-08-01"), "bhxh", "2026-07")!;
    expect(n.hanGoc).toBe("2026-08-31");
    expect(n.canCu).toContain("Điều 34 Luật BHXH 2024");
  });

  it("không đóng BHXH thì không hiện mốc nào", () => {
    const ds = lichNghiaVu("2026-08-01", 120, { khaiTheo: "thang", coBhxh: false });
    expect(ds.some((n) => n.loai === "bhxh")).toBe(false);
  });
});

describe("lichNghiaVu — quyết toán năm", () => {
  it("quyết toán TNDN, TNCN và BCTC năm 2025 đều hạn 31/03/2026", () => {
    const ds = thang("2026-03-01", 60);
    for (const loai of ["quyet_toan_tndn", "quyet_toan_tncn", "bctc"]) {
      expect(tim(ds, loai, "2025")!.hanGoc, loai).toBe("2026-03-31");
    }
  });

  it("quyết toán TNCN ghi rõ là bản DOANH NGHIỆP nộp", () => {
    // Cá nhân tự quyết toán thì hạn cuối tháng thứ 4, khác hẳn — không phải
    // việc của trung tâm, nhưng nhầm hai cái là nộp muộn một tháng.
    expect(tim(thang("2026-03-01", 60), "quyet_toan_tncn", "2025")!.canCu).toContain("doanh nghiệp nộp");
  });
});

describe("dời cuối tuần và cảnh báo lễ", () => {
  it("hạn rơi vào cuối tuần thì dời sang thứ Hai", () => {
    // 20/06/2026 là thứ Bảy → dời sang 22/06 (thứ Hai).
    const n = tim(thang("2026-06-01"), "gtgt", "2026-05")!;
    expect(n.hanGoc).toBe("2026-06-20");
    expect(n.han).toBe("2026-06-22");
    expect(n.doiViCuoiTuan).toBe(true);
  });

  it("hạn ngày thường thì không dời", () => {
    const n = tim(thang("2026-08-01"), "gtgt", "2026-07")!;
    expect(n.han).toBe(n.hanGoc);
    expect(n.doiViCuoiTuan).toBe(false);
  });

  it("KHÔNG tự đoán ngày nghỉ lễ — chỉ gắn cờ để người kiểm lại", () => {
    // Tết và Giỗ Tổ theo âm lịch, lịch nghỉ do Chính phủ công bố từng năm.
    // Đoán ra một ngày rồi trình bày như hạn chính thức là tệ hơn không nói gì:
    // khách tin và nộp muộn.
    const q1 = tim(quy("2026-04-01"), "gtgt", "Q1/2026")!;
    expect(q1.han).toBe("2026-04-30"); // đúng ngày gốc, KHÔNG tự dời vì 30/4 là lễ
    expect(q1.canKiemLichLe).toBe(true);
  });

  it("hạn tháng 8 không cần kiểm lịch lễ", () => {
    expect(tim(thang("2026-08-01"), "gtgt", "2026-07")!.canKiemLichLe).toBe(false);
  });
});

describe("cửa sổ thời gian", () => {
  it("chỉ trả nghĩa vụ trong khoảng nhìn tới", () => {
    const ds = thang("2026-08-01", 30);
    for (const n of ds) {
      expect(n.conBaoNhieuNgay).toBeLessThanOrEqual(30);
      expect(n.conBaoNhieuNgay).toBeGreaterThanOrEqual(-30);
    }
  });

  it("có nhìn lại 30 ngày để bắt hạn đã lỡ", () => {
    // Quên một hạn thì biết muộn còn hơn không biết — tiền phạt tính theo ngày.
    const ds = thang("2026-08-25", 10);
    expect(quaHan(ds).length).toBeGreaterThan(0);
    expect(quaHan(ds).every((n) => n.conBaoNhieuNgay < 0)).toBe(true);
  });

  it("sắp tới hạn lọc đúng khoảng", () => {
    const ds = thang("2026-08-10", 60);
    expect(sapToiHan(ds, 14).every((n) => n.conBaoNhieuNgay >= 0 && n.conBaoNhieuNgay <= 14)).toBe(true);
  });

  it("sắp xếp theo hạn tăng dần", () => {
    const ds = thang("2026-08-01");
    for (let i = 1; i < ds.length; i++) expect(ds[i].han >= ds[i - 1].han).toBe(true);
  });
});

describe("lệ phí môn bài", () => {
  it("KHÔNG còn trong lịch — từ 2026 không phải nộp nữa", () => {
    // Đây là mốc quen thuộc nhất trong mọi lịch thuế cũ. Nhắc một nghĩa vụ đã
    // bị bỏ là làm khách mất công đi làm một việc không tồn tại.
    const ds = lichNghiaVu("2026-01-01", 365, { khaiTheo: "thang", coBhxh: true });
    expect(ds.some((n) => String(n.loai).includes("mon_bai"))).toBe(false);
    expect(ds.some((n) => n.nhan.toLowerCase().includes("môn bài"))).toBe(false);
  });
});
