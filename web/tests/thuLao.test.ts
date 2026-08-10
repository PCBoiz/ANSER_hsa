import { describe, expect, it } from "vitest";
import { lamTronNuaLen, nenHoiCamKet08, tinhThuLao, type BuoiTinh } from "@/server/tinhToan/thuLao";

const NGUONG = 2_000_000;
const buoi = (n: number, donGia = 500_000): BuoiTinh[] =>
  Array.from({ length: n }, (_, i) => ({
    ngay: `2026-07-${String(i + 1).padStart(2, "0")}`,
    donGia,
    tinhTheo: "buoi" as const,
  }));

function phaiOk(kq: ReturnType<typeof tinhThuLao>) {
  if (!kq.ok) throw new Error(`Chờ ok nhưng lỗi: ${kq.loi.thongDiep}`);
  return kq.ketQua;
}

describe("tinhThuLao — ngưỡng khấu trừ", () => {
  it("KHẤU TRỪ 10% TRÊN TOÀN BỘ khoản chi, không phải phần vượt ngưỡng", () => {
    // Đây là chỗ sai phổ biến nhất, và sai theo hướng thiệt cho trung tâm:
    // trả 5 triệu thì khấu trừ 500k, KHÔNG phải 10% của (5tr − 2tr) = 300k.
    const kq = phaiOk(tinhThuLao(buoi(10), { nguongApDung: NGUONG, coCamKet08: false }));
    expect(kq.tongTruocThue).toBe(5_000_000);
    expect(kq.khauTruTncn).toBe(500_000);
    expect(kq.thucNhan).toBe(4_500_000);
  });

  it("dưới ngưỡng thì không khấu trừ", () => {
    const kq = phaiOk(tinhThuLao(buoi(3), { nguongApDung: NGUONG, coCamKet08: false }));
    expect(kq.tongTruocThue).toBe(1_500_000);
    expect(kq.apDungKhauTru).toBe(false);
    expect(kq.khauTruTncn).toBe(0);
    expect(kq.thucNhan).toBe(1_500_000);
  });

  it("ĐÚNG BẰNG ngưỡng thì có khấu trừ — 'từ ... trở lên'", () => {
    const kq = phaiOk(tinhThuLao(buoi(4), { nguongApDung: NGUONG, coCamKet08: false }));
    expect(kq.tongTruocThue).toBe(2_000_000);
    expect(kq.apDungKhauTru).toBe(true);
    expect(kq.khauTruTncn).toBe(200_000);
  });

  it("thiếu một đồng so với ngưỡng thì không khấu trừ", () => {
    const kq = phaiOk(
      tinhThuLao([{ ngay: "2026-07-01", donGia: 1_999_999, tinhTheo: "buoi" }], {
        nguongApDung: NGUONG,
        coCamKet08: false,
      }),
    );
    expect(kq.apDungKhauTru).toBe(false);
  });

  it("có cam kết 08 thì không khấu trừ dù vượt ngưỡng", () => {
    const kq = phaiOk(tinhThuLao(buoi(20), { nguongApDung: NGUONG, coCamKet08: true }));
    expect(kq.tongTruocThue).toBe(10_000_000);
    expect(kq.apDungKhauTru).toBe(false);
    expect(kq.khauTruTncn).toBe(0);
    expect(kq.lyDo).toContain("cam kết 08");
  });

  it("ngưỡng đổi thì kết quả đổi theo — không hardcode 2 triệu ở đâu cả", () => {
    // Dự thảo đang có hai con số: 3 triệu và 5 triệu.
    const b = buoi(8); // 4 triệu
    expect(phaiOk(tinhThuLao(b, { nguongApDung: 3_000_000, coCamKet08: false })).apDungKhauTru).toBe(true);
    expect(phaiOk(tinhThuLao(b, { nguongApDung: 5_000_000, coCamKet08: false })).apDungKhauTru).toBe(false);
  });
});

describe("tinhThuLao — từ chối khi chưa biết", () => {
  it("KHÔNG TÍNH khi chưa tra được ngưỡng", () => {
    // Lấy 0 thì khấu trừ mọi khoản; lấy vô cực thì không khấu trừ khoản nào.
    // Cả hai đều là một con số bịa. "Chưa biết" khác 0.
    const kq = tinhThuLao(buoi(10), { nguongApDung: undefined, coCamKet08: false });
    expect(kq.ok).toBe(false);
    if (!kq.ok) expect(kq.loi.ma).toBe("thieu_nguong");
  });

  it("tính theo giờ mà thiếu số giờ thì DỪNG, không đoán thành 1 giờ", () => {
    const kq = tinhThuLao([{ ngay: "2026-07-01", donGia: 300_000, tinhTheo: "gio", soGio: null }], {
      nguongApDung: NGUONG,
      coCamKet08: false,
    });
    expect(kq.ok).toBe(false);
    if (!kq.ok) expect(kq.loi.ma).toBe("thieu_so_gio");
  });

  it("đơn giá âm thì dừng", () => {
    const kq = tinhThuLao([{ ngay: "2026-07-01", donGia: -1, tinhTheo: "buoi" }], {
      nguongApDung: NGUONG,
      coCamKet08: false,
    });
    expect(kq.ok).toBe(false);
  });
});

describe("tinhThuLao — tính theo giờ và làm tròn", () => {
  it("nhân đúng số giờ lẻ", () => {
    const kq = phaiOk(
      tinhThuLao(
        [
          { ngay: "2026-07-01", donGia: 300_000, tinhTheo: "gio", soGio: 1.5 },
          { ngay: "2026-07-03", donGia: 300_000, tinhTheo: "gio", soGio: 2 },
        ],
        { nguongApDung: NGUONG, coCamKet08: false },
      ),
    );
    expect(kq.chiTiet[0].thanhTien).toBe(450_000);
    expect(kq.tongTruocThue).toBe(1_050_000);
  });

  it("làm tròn nửa lên, không phải nửa xuống", () => {
    expect(lamTronNuaLen(0.5)).toBe(1);
    expect(lamTronNuaLen(1.5)).toBe(2);
    expect(lamTronNuaLen(2.5)).toBe(3); // JS Math.round cũng ra 3, nhưng -0.5 thì khác
    expect(lamTronNuaLen(1.4)).toBe(1);
  });

  it("khấu trừ cũng làm tròn nửa lên", () => {
    const kq = phaiOk(
      tinhThuLao([{ ngay: "2026-07-01", donGia: 2_000_005, tinhTheo: "buoi" }], {
        nguongApDung: NGUONG,
        coCamKet08: false,
      }),
    );
    expect(kq.khauTruTncn).toBe(200_001); // 200000,5 → 200001
  });

  it("thực nhận luôn bằng tổng trừ khấu trừ — cùng ràng buộc với CHECK ở DB", () => {
    for (const n of [1, 3, 4, 7, 20]) {
      const kq = phaiOk(tinhThuLao(buoi(n), { nguongApDung: NGUONG, coCamKet08: false }));
      expect(kq.thucNhan).toBe(kq.tongTruocThue - kq.khauTruTncn);
    }
  });

  it("không có buổi nào thì tổng bằng 0 và không khấu trừ", () => {
    const kq = phaiOk(tinhThuLao([], { nguongApDung: NGUONG, coCamKet08: false }));
    expect(kq.tongTruocThue).toBe(0);
    expect(kq.apDungKhauTru).toBe(false);
  });

  it("giữ chi tiết từng buổi để giáo viên đối chiếu được", () => {
    const kq = phaiOk(tinhThuLao(buoi(3), { nguongApDung: NGUONG, coCamKet08: false }));
    expect(kq.chiTiet).toHaveLength(3);
    expect(kq.chiTiet[0]).toMatchObject({ ngay: "2026-07-01", donGia: 500_000, thanhTien: 500_000 });
  });
});

describe("nenHoiCamKet08", () => {
  it("gợi ý hỏi khi thu nhập cả năm dưới mức giảm trừ", () => {
    const r = nenHoiCamKet08(100_000_000, 186_000_000);
    expect(r.nen).toBe(true);
    // Phải nói rõ đây chỉ là gợi ý: điều kiện "nguồn thu duy nhất" hệ thống
    // không biết, giáo viên dạy mấy nơi là chuyện ngoài tầm nhìn của mình.
    expect(r.lyDo).toContain("nguồn duy nhất");
  });

  it("không gợi ý khi đã vượt mức giảm trừ", () => {
    expect(nenHoiCamKet08(200_000_000, 186_000_000).nen).toBe(false);
  });

  it("chưa tra được mức giảm trừ thì KHÔNG kết luận", () => {
    const r = nenHoiCamKet08(100_000_000, undefined);
    expect(r.nen).toBe(false);
    expect(r.lyDo).toContain("Chưa tra được");
  });
});
