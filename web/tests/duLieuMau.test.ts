import { describe, expect, it } from "vitest";
import {
  CHI,
  DAP_AN,
  GIAO_VIEN,
  LOP,
  THU,
  TT29_TRANG_THAI,
} from "@/server/duLieuMau/boMau";
import { MUC_TT29, soiHoSoTt29, type MucTt29, type TrangThaiMuc } from "@/server/tinhToan/tt29";
import { tinhThuLao, type BuoiTinh } from "@/server/tinhToan/thuLao";

/**
 * Chấm bộ dữ liệu mẫu bằng chính các bộ soi của sản phẩm.
 *
 * Đây là bài kiểm hai chiều, giống hệt cách đã làm với bộ soi tồn kho ở dự án
 * trước: bộ soi phải tìm ra ĐÚNG những lỗi đã gieo, và KHÔNG gắn cờ thứ gì
 * khác. Một bộ mẫu toàn dữ liệu sạch chỉ chứng minh phần mềm không sập.
 *
 * Test này chạy trên FIXTURE thuần, không cần database — nên nó là hàng rào
 * chạy trong mọi lần `vitest`, không phải một buổi kiểm thủ công.
 */

const NGUONG = 2_000_000; // ngưỡng khấu trừ 10% đang áp dụng

function demDuLieu() {
  return {
    soGiaoVien: GIAO_VIEN.length,
    soGiaoVienChuaCongKhai: GIAO_VIEN.filter((g) => !g.congKhaiDanhSach).length,
    soGiaoVienTruongCong: GIAO_VIEN.filter((g) => g.laGvTruongCong).length,
    soGvTruongCongChuaBaoCao: GIAO_VIEN.filter((g) => g.laGvTruongCong && !g.daBaoCaoHieuTruong).length,
    soLopHoc: LOP.length,
    soLopThieuMon: LOP.filter((l) => !l.mon).length,
    soLopThieuHocPhi: LOP.filter((l) => l.hocPhiMoiBuoi === null && l.hocPhiCaKhoa === null).length,
  };
}

describe("bộ mẫu — lỗi gieo đúng như đáp án", () => {
  const d = demDuLieu();

  it("đếm khớp đáp án", () => {
    expect(d.soGiaoVienChuaCongKhai).toBe(DAP_AN.soGiaoVienChuaCongKhai);
    expect(d.soGiaoVienTruongCong).toBe(DAP_AN.soGiaoVienTruongCong);
    expect(d.soGvTruongCongChuaBaoCao).toBe(DAP_AN.soGvTruongCongChuaBaoCao);
    expect(d.soLopThieuMon).toBe(DAP_AN.soLopThieuMon);
    expect(d.soLopThieuHocPhi).toBe(DAP_AN.soLopThieuHocPhi);
  });

  it("mã giáo viên và mã lớp không trùng nhau", () => {
    expect(new Set(GIAO_VIEN.map((g) => g.ma)).size).toBe(GIAO_VIEN.length);
    expect(new Set(LOP.map((l) => l.ma)).size).toBe(LOP.length);
  });

  it("có CẢ hai ca trường công: một đã báo cáo, một chưa", () => {
    // Chỉ gieo ca sai thì không chứng minh được bộ soi phân biệt được hai ca.
    expect(GIAO_VIEN.some((g) => g.laGvTruongCong && g.daBaoCaoHieuTruong)).toBe(true);
    expect(GIAO_VIEN.some((g) => g.laGvTruongCong && !g.daBaoCaoHieuTruong)).toBe(true);
  });
});

describe("bộ soi TT29 chấm bộ mẫu", () => {
  const trangThai = Object.fromEntries(
    MUC_TT29.map((m) => [m, TT29_TRANG_THAI as TrangThaiMuc]),
  ) as Partial<Record<MucTt29, TrangThaiMuc>>;
  const kq = soiHoSoTt29(trangThai, demDuLieu());

  it("tìm ra ĐÚNG 3 chỗ lệch giữa lời khai và dữ liệu", () => {
    expect(kq.soLech).toBe(DAP_AN.soLechTt29);
  });

  it("ba chỗ lệch đúng là danh sách người dạy, môn học, mức thu học phí", () => {
    const lech = kq.phatHien.filter((p) => p.lechVoiDuLieu).map((p) => p.muc).sort();
    expect(lech).toEqual(["danh_sach_nguoi_day", "mon_hoc", "muc_thu_hoc_phi"]);
  });

  it("bắt được giáo viên trường công chưa báo cáo, và chỉ MỘT người", () => {
    const p = kq.phatHien.find((x) => x.muc === "rui_ro_gv_truong_cong")!;
    expect(p.mucDo).toBe("thieu");
    expect(p.thongDiep).toContain("1/2");
  });

  it("KHÔNG sẵn sàng tuyển sinh — dù đã khai đủ sáu mục", () => {
    expect(kq.sanSangTuyenSinh).toBe(DAP_AN.sanSangTuyenSinh);
  });

  it("KHÔNG gắn cờ oan mục nào — ba mục còn lại phải đạt", () => {
    const dat = kq.phatHien.filter((p) => p.mucDo === "dat").map((p) => p.muc).sort();
    expect(dat).toEqual(["dang_ky_kinh_doanh", "dia_diem_hinh_thuc_thoi_gian", "thoi_luong_theo_khoi"]);
  });
});

describe("sổ thu chi trên bộ mẫu", () => {
  const tongThu = THU.reduce((s, t) => s + t.soTien, 0);
  const tongChi = CHI.reduce((s, c) => s + c.soTien, 0);

  it("tổng thu, tổng chi và lãi khớp đáp án", () => {
    expect(tongThu).toBe(DAP_AN.tongThu);
    expect(tongChi).toBe(DAP_AN.tongChi);
    expect(tongThu - tongChi).toBe(DAP_AN.lai);
  });

  it("phần đã kê khai KHÁC tổng doanh thu — đúng điểm chính của sản phẩm", () => {
    const daKe = THU.filter((t) => t.dienKeKhai === "da_ke_khai").reduce((s, t) => s + t.soTien, 0);
    expect(daKe).toBe(DAP_AN.thuDaKeKhai);
    expect(daKe).toBeLessThan(tongThu);
  });

  it("có đúng 3 dòng chưa ai quyết kê khai", () => {
    const chua = THU.filter((t) => t.dienKeKhai === "chua_quyet");
    expect(chua).toHaveLength(DAP_AN.soDongThuChuaQuyet);
    expect(chua.reduce((s, t) => s + t.soTien, 0)).toBe(DAP_AN.thuChuaQuyet);
  });

  it("có khoản chi KHÔNG được trừ, kèm lý do", () => {
    const khong = CHI.filter((c) => !c.duocTru);
    expect(khong.length).toBeGreaterThan(0);
    for (const c of khong) expect(c.lyDoKhongTru).toBeTruthy();
    expect(CHI.filter((c) => c.duocTru).reduce((s, c) => s + c.soTien, 0)).toBe(DAP_AN.chiDuocTru);
  });

  it("có cả doanh thu không chịu thuế lẫn chịu 10% — đúng ranh giới hay khai nhầm", () => {
    expect(THU.some((t) => t.dienThue === "khong_chiu")).toBe(true);
    expect(THU.some((t) => t.dienThue === "gtgt_10")).toBe(true);
  });
});

describe("thù lao trên bộ mẫu — hai ca đối nghịch quanh ngưỡng", () => {
  const tinh = (ma: string) => {
    const gv = GIAO_VIEN.find((g) => g.ma === ma)!;
    const buoi = gv.buoi.map<BuoiTinh>((b) => ({
      ngay: `2026-07-${String(b.ngayTrongThang).padStart(2, "0")}`,
      donGia: b.donGia,
      tinhTheo: "buoi",
    }));
    const kq = tinhThuLao(buoi, { nguongApDung: NGUONG, coCamKet08: false });
    if (!kq.ok) throw new Error(kq.loi.thongDiep);
    return kq.ketQua;
  };

  it("GV-01 trên ngưỡng → khấu trừ 10% trên TOÀN BỘ", () => {
    const k = tinh("GV-01");
    const d = DAP_AN.thuLao["GV-01"];
    expect(k.tongTruocThue).toBe(d.tong);
    expect(k.khauTruTncn).toBe(d.khauTru);
    expect(k.thucNhan).toBe(d.thucNhan);
    expect(k.apDungKhauTru).toBe(d.apDungKhauTru);
  });

  it("GV-06 dưới ngưỡng → không khấu trừ", () => {
    const k = tinh("GV-06");
    const d = DAP_AN.thuLao["GV-06"];
    expect(k.tongTruocThue).toBe(d.tong);
    expect(k.khauTruTncn).toBe(0);
    expect(k.apDungKhauTru).toBe(false);
  });

  it("bộ mẫu có giáo viên KHÔNG có buổi nào — không được làm bộ tính vỡ", () => {
    const k = tinh("GV-05");
    expect(k.soBuoi).toBe(0);
    expect(k.tongTruocThue).toBe(0);
  });
});
