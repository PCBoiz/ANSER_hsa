/**
 * Soi hồ sơ TT29. Hàm thuần, không DB.
 *
 * Thông tư 29/2024/TT-BGDĐT, hiệu lực 14/02/2025: tổ chức dạy thêm ngoài nhà
 * trường **có thu tiền** phải công khai SÁU mục trên cổng thông tin điện tử
 * hoặc niêm yết tại trụ sở, **trước khi tuyển sinh**.
 *
 * Điểm của bộ soi này KHÔNG phải là một danh sách tích. Đánh dấu "đã công khai"
 * thì ai cũng làm được. Giá trị nằm ở chỗ **đối chiếu điều đã khai với dữ liệu
 * thật trong hệ thống**: khai đã công khai danh sách người dạy, nhưng trong
 * bảng giáo viên còn 3 người chưa đánh dấu công khai — đó mới là phát hiện.
 */

export const MUC_TT29 = [
  "mon_hoc",
  "thoi_luong_theo_khoi",
  "dia_diem_hinh_thuc_thoi_gian",
  "danh_sach_nguoi_day",
  "muc_thu_hoc_phi",
  "dang_ky_kinh_doanh",
] as const;
export type MucTt29 = (typeof MUC_TT29)[number];

export const NHAN_MUC: Record<MucTt29, string> = {
  mon_hoc: "Môn học được tổ chức dạy thêm",
  thoi_luong_theo_khoi: "Thời lượng dạy thêm theo từng khối lớp",
  dia_diem_hinh_thuc_thoi_gian: "Địa điểm, hình thức, thời gian tổ chức",
  danh_sach_nguoi_day: "Danh sách người dạy thêm",
  muc_thu_hoc_phi: "Mức thu tiền học thêm",
  dang_ky_kinh_doanh: "Đăng ký kinh doanh theo quy định",
};

export type TrangThaiMuc = "thieu" | "dang_lam" | "da_cong_khai";

export type DuLieuDoiChieu = {
  soGiaoVien: number;
  soGiaoVienChuaCongKhai: number;
  soGiaoVienTruongCong: number;
  soGvTruongCongChuaBaoCao: number;
  soLopHoc: number;
  soLopThieuMon: number;
  soLopThieuHocPhi: number;
};

export type MucDo = "dat" | "canh_bao" | "thieu";

export type PhatHien = {
  muc: MucTt29 | "rui_ro_gv_truong_cong";
  nhan: string;
  mucDo: MucDo;
  thongDiep: string;
  /** `true` khi trạng thái khai KHÁC với dữ liệu thật — chỗ đáng xem nhất. */
  lechVoiDuLieu: boolean;
};

export type KetQuaSoi = {
  phatHien: PhatHien[];
  soThieu: number;
  soCanhBao: number;
  soLech: number;
  sanSangTuyenSinh: boolean;
};

/**
 * `trangThai` là điều trung tâm KHAI. `duLieu` là điều hệ thống THẤY.
 * Mọi chỗ hai thứ đó lệch nhau đều được đánh dấu `lechVoiDuLieu`.
 */
export function soiHoSoTt29(
  trangThai: Partial<Record<MucTt29, TrangThaiMuc>>,
  duLieu: DuLieuDoiChieu,
): KetQuaSoi {
  const phatHien: PhatHien[] = [];

  const them = (
    muc: PhatHien["muc"],
    nhan: string,
    mucDo: MucDo,
    thongDiep: string,
    lech = false,
  ) => phatHien.push({ muc, nhan, mucDo, thongDiep, lechVoiDuLieu: lech });

  for (const muc of MUC_TT29) {
    const tt = trangThai[muc] ?? "thieu";
    const nhan = NHAN_MUC[muc];

    if (tt === "thieu") {
      them(muc, nhan, "thieu", "Chưa công khai. Đây là mục bắt buộc trước khi tuyển sinh.");
      continue;
    }
    if (tt === "dang_lam") {
      them(muc, nhan, "canh_bao", "Đang làm — phải xong TRƯỚC khi tuyển sinh, không phải sau.");
      continue;
    }

    // Đã khai là công khai. Giờ soi lại bằng dữ liệu thật.
    switch (muc) {
      case "danh_sach_nguoi_day":
        if (duLieu.soGiaoVien === 0) {
          them(muc, nhan, "canh_bao",
            "Khai đã công khai nhưng trong hệ thống chưa có giáo viên nào — không có gì để công khai.",
            true);
        } else if (duLieu.soGiaoVienChuaCongKhai > 0) {
          them(muc, nhan, "canh_bao",
            `Khai đã công khai, nhưng ${duLieu.soGiaoVienChuaCongKhai}/${duLieu.soGiaoVien} giáo viên ` +
              "chưa được đánh dấu có trong danh sách công khai. Danh sách thiếu người là danh sách sai.",
            true);
        } else {
          them(muc, nhan, "dat", `Đã công khai đủ ${duLieu.soGiaoVien} giáo viên.`);
        }
        break;

      case "mon_hoc":
        if (duLieu.soLopHoc === 0) {
          them(muc, nhan, "canh_bao",
            "Khai đã công khai nhưng chưa có lớp nào trong hệ thống để đối chiếu.", true);
        } else if (duLieu.soLopThieuMon > 0) {
          them(muc, nhan, "canh_bao",
            `${duLieu.soLopThieuMon}/${duLieu.soLopHoc} lớp chưa ghi môn — không đối chiếu được với bản công khai.`,
            true);
        } else {
          them(muc, nhan, "dat", `Đã công khai, khớp ${duLieu.soLopHoc} lớp trong hệ thống.`);
        }
        break;

      case "muc_thu_hoc_phi":
        if (duLieu.soLopThieuHocPhi > 0) {
          them(muc, nhan, "canh_bao",
            `${duLieu.soLopThieuHocPhi} lớp chưa ghi mức học phí — bản công khai và hệ thống lệch nhau.`,
            true);
        } else {
          them(muc, nhan, "dat", "Đã công khai.");
        }
        break;

      default:
        them(muc, nhan, "dat", "Đã công khai.");
    }
  }

  /**
   * Rủi ro riêng, không thuộc sáu mục nhưng nằm cùng TT29 và nặng hơn cả sáu mục.
   *
   * Giáo viên trường công đang dạy phải báo cáo hiệu trưởng khi dạy thêm ngoài.
   * Và danh sách người dạy lại là thứ BẮT BUỘC công khai — nên không giấu được.
   * Không phải việc mình sửa, nhưng phải chỉ ra.
   */
  if (duLieu.soGvTruongCongChuaBaoCao > 0) {
    them("rui_ro_gv_truong_cong", "Giáo viên trường công chưa báo cáo hiệu trưởng", "thieu",
      `${duLieu.soGvTruongCongChuaBaoCao}/${duLieu.soGiaoVienTruongCong} giáo viên trường công chưa ` +
        "ghi nhận báo cáo hiệu trưởng. Danh sách người dạy là thứ bắt buộc công khai, nên đây là " +
        "thứ không giấu được.");
  } else if (duLieu.soGiaoVienTruongCong > 0) {
    them("rui_ro_gv_truong_cong", "Giáo viên trường công", "dat",
      `${duLieu.soGiaoVienTruongCong} giáo viên trường công đều đã ghi nhận báo cáo hiệu trưởng.`);
  }

  const soThieu = phatHien.filter((p) => p.mucDo === "thieu").length;
  const soCanhBao = phatHien.filter((p) => p.mucDo === "canh_bao").length;

  return {
    phatHien,
    soThieu,
    soCanhBao,
    soLech: phatHien.filter((p) => p.lechVoiDuLieu).length,
    // "Sẵn sàng tuyển sinh" đòi hỏi KHÔNG còn mục thiếu VÀ không còn cảnh báo.
    // Nới lỏng chỗ này là biến bộ soi thành một cái nút bấm cho yên tâm.
    sanSangTuyenSinh: soThieu === 0 && soCanhBao === 0,
  };
}
