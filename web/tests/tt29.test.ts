import { describe, expect, it } from "vitest";
import { MUC_TT29, soiHoSoTt29, type DuLieuDoiChieu, type MucTt29, type TrangThaiMuc } from "@/server/tinhToan/tt29";

const SACH: DuLieuDoiChieu = {
  soGiaoVien: 5,
  soGiaoVienChuaCongKhai: 0,
  soGiaoVienTruongCong: 0,
  soGvTruongCongChuaBaoCao: 0,
  soLopHoc: 4,
  soLopThieuMon: 0,
  soLopThieuHocPhi: 0,
};

const tatCa = (tt: TrangThaiMuc): Partial<Record<MucTt29, TrangThaiMuc>> =>
  Object.fromEntries(MUC_TT29.map((m) => [m, tt]));

describe("soiHoSoTt29 — sáu mục bắt buộc", () => {
  it("chưa khai gì thì thiếu đủ sáu mục", () => {
    const kq = soiHoSoTt29({}, SACH);
    expect(kq.soThieu).toBe(6);
    expect(kq.sanSangTuyenSinh).toBe(false);
  });

  it("khai đủ và dữ liệu khớp thì sẵn sàng tuyển sinh", () => {
    const kq = soiHoSoTt29(tatCa("da_cong_khai"), SACH);
    expect(kq.soThieu).toBe(0);
    expect(kq.soCanhBao).toBe(0);
    expect(kq.sanSangTuyenSinh).toBe(true);
  });

  it("'đang làm' KHÔNG tính là xong — phải xong TRƯỚC khi tuyển sinh", () => {
    const kq = soiHoSoTt29(tatCa("dang_lam"), SACH);
    expect(kq.soCanhBao).toBe(6);
    expect(kq.sanSangTuyenSinh).toBe(false);
    expect(kq.phatHien[0].thongDiep).toContain("TRƯỚC khi tuyển sinh");
  });

  it("thiếu một mục cũng chưa sẵn sàng", () => {
    const tt = tatCa("da_cong_khai");
    delete tt.muc_thu_hoc_phi;
    expect(soiHoSoTt29(tt, SACH).sanSangTuyenSinh).toBe(false);
  });
});

/**
 * Đây là phần đáng giá của bộ soi. Đánh dấu "đã công khai" thì ai cũng làm
 * được — giá trị nằm ở chỗ đối chiếu điều đã khai với dữ liệu thật.
 */
describe("soiHoSoTt29 — đối chiếu lời khai với dữ liệu thật", () => {
  it("khai đã công khai danh sách người dạy nhưng còn giáo viên chưa đánh dấu", () => {
    const kq = soiHoSoTt29(tatCa("da_cong_khai"), { ...SACH, soGiaoVienChuaCongKhai: 3 });
    const p = kq.phatHien.find((x) => x.muc === "danh_sach_nguoi_day")!;
    expect(p.mucDo).toBe("canh_bao");
    expect(p.lechVoiDuLieu).toBe(true);
    expect(p.thongDiep).toContain("3/5");
    expect(kq.sanSangTuyenSinh).toBe(false);
  });

  it("khai đã công khai danh sách nhưng hệ thống chưa có giáo viên nào", () => {
    const kq = soiHoSoTt29(tatCa("da_cong_khai"), { ...SACH, soGiaoVien: 0, soGiaoVienChuaCongKhai: 0 });
    const p = kq.phatHien.find((x) => x.muc === "danh_sach_nguoi_day")!;
    expect(p.lechVoiDuLieu).toBe(true);
    expect(p.thongDiep).toContain("không có gì để công khai");
  });

  it("khai đã công khai môn học nhưng còn lớp chưa ghi môn", () => {
    const kq = soiHoSoTt29(tatCa("da_cong_khai"), { ...SACH, soLopThieuMon: 2 });
    const p = kq.phatHien.find((x) => x.muc === "mon_hoc")!;
    expect(p.lechVoiDuLieu).toBe(true);
    expect(p.thongDiep).toContain("2/4");
  });

  it("khai đã công khai học phí nhưng còn lớp chưa ghi mức thu", () => {
    const kq = soiHoSoTt29(tatCa("da_cong_khai"), { ...SACH, soLopThieuHocPhi: 1 });
    expect(kq.phatHien.find((x) => x.muc === "muc_thu_hoc_phi")!.lechVoiDuLieu).toBe(true);
  });

  it("đếm đúng số chỗ lệch", () => {
    const kq = soiHoSoTt29(tatCa("da_cong_khai"), {
      ...SACH,
      soGiaoVienChuaCongKhai: 1,
      soLopThieuMon: 1,
      soLopThieuHocPhi: 1,
    });
    expect(kq.soLech).toBe(3);
  });

  it("mục chưa khai thì KHÔNG tính là lệch — chưa khai khác khai sai", () => {
    const kq = soiHoSoTt29({}, { ...SACH, soGiaoVienChuaCongKhai: 3 });
    expect(kq.soLech).toBe(0);
    expect(kq.soThieu).toBe(6);
  });
});

describe("soiHoSoTt29 — rủi ro giáo viên trường công", () => {
  it("có giáo viên trường công chưa báo cáo hiệu trưởng thì báo mức thiếu", () => {
    const kq = soiHoSoTt29(tatCa("da_cong_khai"), {
      ...SACH,
      soGiaoVienTruongCong: 2,
      soGvTruongCongChuaBaoCao: 2,
    });
    const p = kq.phatHien.find((x) => x.muc === "rui_ro_gv_truong_cong")!;
    expect(p.mucDo).toBe("thieu");
    // Danh sách người dạy là thứ bắt buộc công khai — nên đây là thứ không giấu được.
    expect(p.thongDiep).toContain("không giấu được");
    expect(kq.sanSangTuyenSinh).toBe(false);
  });

  it("báo cáo đủ thì hiện đạt", () => {
    const kq = soiHoSoTt29(tatCa("da_cong_khai"), {
      ...SACH,
      soGiaoVienTruongCong: 2,
      soGvTruongCongChuaBaoCao: 0,
    });
    expect(kq.phatHien.find((x) => x.muc === "rui_ro_gv_truong_cong")!.mucDo).toBe("dat");
    expect(kq.sanSangTuyenSinh).toBe(true);
  });

  it("không có giáo viên trường công thì không nhắc tới", () => {
    const kq = soiHoSoTt29(tatCa("da_cong_khai"), SACH);
    expect(kq.phatHien.find((x) => x.muc === "rui_ro_gv_truong_cong")).toBeUndefined();
  });
});
