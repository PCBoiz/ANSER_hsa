import { describe, expect, it } from "vitest";
import {
  chuanHoaKy,
  duongDanKho,
  hienKichThuoc,
  laLoaiHopLe,
  lamSachTenFile,
  phanTichDuongDan,
  vaiTroToiThieuXem,
} from "@/server/tinhToan/taiLieu";

describe("chuanHoaKy", () => {
  it("bỏ trống nghĩa là không thuộc kỳ nào, không phải lỗi", () => {
    for (const x of [undefined, null, ""]) expect(chuanHoaKy(x)).toEqual({ ky: null });
  });

  it("nhận YYYY và YYYY-MM", () => {
    expect(chuanHoaKy("2026")).toEqual({ ky: "2026" });
    expect(chuanHoaKy("2026-07")).toEqual({ ky: "2026-07" });
  });

  it("đệm 0 cho tháng một chữ số và nhận cả dấu gạch chéo", () => {
    expect(chuanHoaKy("2026-7")).toEqual({ ky: "2026-07" });
    expect(chuanHoaKy("2026/7")).toEqual({ ky: "2026-07" });
  });

  it("gõ sai thì BÁO LỖI, không lặng lẽ coi như không có kỳ", () => {
    // Đây là chỗ dễ sai nhất: nuốt lỗi thì tài liệu rơi vào ngăn "không thuộc
    // kỳ nào" và không ai tìm lại được, mà cũng không có gì báo.
    expect(chuanHoaKy("thang 7").loi).toBeTruthy();
    expect(chuanHoaKy("2026-13").loi).toContain("13");
    expect(chuanHoaKy("1999").loi).toBeTruthy();
    expect(chuanHoaKy("2101").loi).toBeTruthy();
  });
});

describe("lamSachTenFile", () => {
  it("bỏ dấu tiếng Việt", () => {
    expect(lamSachTenFile("Hợp đồng lao động.pdf")).toBe("Hop-dong-lao-dong.pdf");
  });

  it("vô hiệu hoá đường dẫn leo thư mục", () => {
    const ra = lamSachTenFile("../../etc/passwd");
    expect(ra).not.toContain("..");
    expect(ra).not.toContain("/");
  });

  it("tên toàn ký tự lạ vẫn ra một tên dùng được", () => {
    expect(lamSachTenFile("...")).toBe("tai-lieu");
    expect(lamSachTenFile("   ")).toBe("tai-lieu");
  });

  it("cắt tên quá dài", () => {
    expect(lamSachTenFile("a".repeat(300)).length).toBeLessThanOrEqual(120);
  });
});

describe("duongDanKho", () => {
  it("xếp theo kỳ rồi tới loại, và luôn có id để không đè nhau", () => {
    expect(
      duongDanKho({ loai: "sao_ke", ky: "2026-07", id: "abc", ten: "Sao kê VCB.xlsx" }),
    ).toBe("2026-07/sao_ke/abc-Sao-ke-VCB.xlsx");
  });

  it("không có kỳ thì vào ngăn riêng chứ không vào thư mục gốc", () => {
    expect(duongDanKho({ loai: "giay_phep", ky: null, id: "x", ten: "GP.pdf" })).toBe(
      "khong-ky/giay_phep/x-GP.pdf",
    );
  });

  it("hai file cùng tên trong cùng kỳ không đè nhau", () => {
    const a = duongDanKho({ loai: "chung_tu", ky: "2026-07", id: "id1", ten: "hoa-don.pdf" });
    const b = duongDanKho({ loai: "chung_tu", ky: "2026-07", id: "id2", ten: "hoa-don.pdf" });
    expect(a).not.toBe(b);
  });
});

describe("vaiTroToiThieuXem", () => {
  it("hợp đồng chỉ quản lý xem được — trong đó có mức lương từng người", () => {
    expect(vaiTroToiThieuXem("hop_dong")).toBe("quan_ly");
  });

  it("chứng từ và sao kê thì kế toán xem được", () => {
    for (const l of ["chung_tu", "sao_ke", "ban_xuat_misa", "to_khai"] as const) {
      expect(vaiTroToiThieuXem(l)).toBe("ke_toan");
    }
  });
});

describe("laLoaiHopLe", () => {
  it("chặn loại bịa ra — cột này có CHECK ở tầng DB, sai là 500", () => {
    expect(laLoaiHopLe("chung_tu")).toBe(true);
    expect(laLoaiHopLe("linh_tinh")).toBe(false);
    expect(laLoaiHopLe(null)).toBe(false);
    expect(laLoaiHopLe(7)).toBe(false);
  });
});

describe("hienKichThuoc", () => {
  it("chưa biết cỡ thì hiện gạch, KHÔNG hiện 0 B", () => {
    expect(hienKichThuoc(null)).toBe("—");
    expect(hienKichThuoc(undefined)).toBe("—");
    expect(hienKichThuoc(0)).toBe("0 B");
  });

  it("đổi đơn vị đúng", () => {
    expect(hienKichThuoc(512)).toBe("512 B");
    expect(hienKichThuoc(2048)).toBe("2.0 KB");
    expect(hienKichThuoc(5 * 1024 * 1024)).toBe("5.0 MB");
  });
});

/**
 * Bước xác nhận sau khi trình duyệt đẩy thẳng lên R2 KHÔNG được tin `loai` và
 * `ky` client gửi kèm — nếu tin thì kế toán xin URL cho `chung_tu`, thứ họ được
 * phép, rồi lúc xác nhận khai thành loại khác. Đường dẫn đã bị khoá cứng trong
 * chữ ký nên nó là nguồn duy nhất tin được.
 */
describe("phanTichDuongDan", () => {
  it("đọc ngược đúng kỳ, loại và id", () => {
    const id = "2f8a1c34-5b6d-4e7f-8a9b-0c1d2e3f4a5b";
    expect(phanTichDuongDan(`2026-07/sao_ke/${id}-Sao-ke-VCB.xlsx`)).toEqual({
      ky: "2026-07",
      loai: "sao_ke",
      id,
    });
  });

  it("hiểu ngăn không thuộc kỳ nào", () => {
    const id = "2f8a1c34-5b6d-4e7f-8a9b-0c1d2e3f4a5b";
    expect(phanTichDuongDan(`khong-ky/giay_phep/${id}-GP.pdf`)?.ky).toBeNull();
  });

  it("từ chối loại bịa — không cho lách quyền qua đường dẫn", () => {
    const id = "2f8a1c34-5b6d-4e7f-8a9b-0c1d2e3f4a5b";
    expect(phanTichDuongDan(`2026-07/linh_tinh/${id}-a.pdf`)).toBeNull();
  });

  it("từ chối kỳ sai định dạng", () => {
    const id = "2f8a1c34-5b6d-4e7f-8a9b-0c1d2e3f4a5b";
    expect(phanTichDuongDan(`T7-2026/chung_tu/${id}-a.pdf`)).toBeNull();
  });

  it("từ chối đường dẫn không có id dạng uuid", () => {
    expect(phanTichDuongDan("2026-07/chung_tu/khong-phai-uuid-a.pdf")).toBeNull();
  });

  it("từ chối đường dẫn thiếu tầng hoặc rỗng", () => {
    for (const x of ["", "chung_tu/a.pdf", "2026-07/chung_tu/", "/"]) {
      expect(phanTichDuongDan(x), x).toBeNull();
    }
  });

  it("khớp được với đường dẫn do chính duongDanKho sinh ra", () => {
    const id = "2f8a1c34-5b6d-4e7f-8a9b-0c1d2e3f4a5b";
    for (const ky of ["2026-07", null]) {
      const d = duongDanKho({ loai: "hop_dong", ky, id, ten: "Hợp đồng lao động.pdf" });
      expect(phanTichDuongDan(d)).toEqual({ ky, loai: "hop_dong", id });
    }
  });
});
