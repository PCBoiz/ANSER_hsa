/**
 * Bộ dữ liệu mẫu — ĐỀ BÀI CÓ ĐÁP ÁN.
 *
 * Cùng khuôn đã dùng với bộ soi tồn kho ở dự án trước: gieo sẵn lỗi đã biết,
 * rồi để test chấm hai chiều — bộ soi phải tìm ra **đúng** những lỗi đã gieo và
 * **không gắn cờ** thứ gì khác. Một bộ mẫu toàn dữ liệu sạch chỉ chứng minh
 * được phần mềm không sập; nó không chứng minh được phần mềm tìm ra cái gì.
 *
 * Tên người và tên trung tâm ở đây là **hư cấu**. Repo này public — không đưa
 * tên khách thật vào bất kỳ chỗ nào lên GitHub.
 *
 * Mọi dòng gieo ra đều mang `nguon = 'mau'`, nên xoá sạch là một câu
 * `DELETE WHERE nguon='mau'` — không phải xoá theo ngày tạo. Khách sẽ gõ dữ
 * liệu thật xen vào giữa dữ liệu mẫu ngay buổi đầu.
 */

export type GiaoVienMau = {
  ma: string;
  hoTen: string;
  mon: string | null;
  laGvTruongCong: boolean;
  daBaoCaoHieuTruong: boolean;
  congKhaiDanhSach: boolean;
  /** ngày dạy trong kỳ, mỗi phần tử một buổi */
  buoi: { ngayTrongThang: number; donGia: number }[];
};

export type LopMau = {
  ma: string;
  ten: string;
  mon: string | null;
  hocPhiMoiBuoi: number | null;
  hocPhiCaKhoa: number | null;
};

export type ThuMau = {
  ngayTrongThang: number;
  soTien: number;
  moTa: string;
  dienThue: "khong_chiu" | "gtgt_5" | "gtgt_10" | "chua_quyet";
  dienKeKhai: "da_ke_khai" | "chua_ke_khai" | "chua_quyet";
};

export type ChiMau = {
  ngayTrongThang: number;
  soTien: number;
  moTa: string;
  nhom: string;
  duocTru: boolean;
  lyDoKhongTru?: string;
};

/* ═══════════════════════════════ giáo viên ═══════════════════════════════ */

export const GIAO_VIEN: GiaoVienMau[] = [
  {
    // Trên ngưỡng → phải khấu trừ 10% trên TOÀN BỘ. 10 buổi × 500k = 5.000.000đ
    ma: "GV-01",
    hoTen: "Phạm Thu Hà",
    mon: "Toán",
    laGvTruongCong: false,
    daBaoCaoHieuTruong: false,
    congKhaiDanhSach: true,
    buoi: [2, 4, 7, 9, 11, 14, 16, 18, 21, 23].map((d) => ({ ngayTrongThang: d, donGia: 500_000 })),
  },
  {
    // LỖI GIEO 1: giáo viên trường công CHƯA báo cáo hiệu trưởng.
    ma: "GV-02",
    hoTen: "Đỗ Minh Khoa",
    mon: "Vật lý",
    laGvTruongCong: true,
    daBaoCaoHieuTruong: false,
    congKhaiDanhSach: true,
    buoi: [3, 6, 10, 13, 17, 20].map((d) => ({ ngayTrongThang: d, donGia: 600_000 })),
  },
  {
    // Trường công nhưng ĐÃ báo cáo — để bộ soi phải phân biệt được hai ca này.
    ma: "GV-03",
    hoTen: "Bùi Lan Anh",
    mon: "Hoá học",
    laGvTruongCong: true,
    daBaoCaoHieuTruong: true,
    congKhaiDanhSach: true,
    buoi: [5, 12, 19].map((d) => ({ ngayTrongThang: d, donGia: 550_000 })),
  },
  {
    // LỖI GIEO 2: chưa đánh dấu có trong danh sách công khai.
    ma: "GV-04",
    hoTen: "Vũ Đức Thắng",
    mon: "Tiếng Anh",
    laGvTruongCong: false,
    daBaoCaoHieuTruong: false,
    congKhaiDanhSach: false,
    buoi: [8, 15, 22].map((d) => ({ ngayTrongThang: d, donGia: 500_000 })),
  },
  {
    // LỖI GIEO 3 (cùng loại với GV-04, để đếm ra 2 chứ không phải 1).
    ma: "GV-05",
    hoTen: "Ngô Bảo Châu",
    mon: "Ngữ văn",
    laGvTruongCong: false,
    daBaoCaoHieuTruong: false,
    congKhaiDanhSach: false,
    buoi: [],
  },
  {
    // DƯỚI ngưỡng 2 triệu → KHÔNG khấu trừ. 3 buổi × 400k = 1.200.000đ
    ma: "GV-06",
    hoTen: "Trịnh Hải Yến",
    mon: "Sinh học",
    laGvTruongCong: false,
    daBaoCaoHieuTruong: false,
    congKhaiDanhSach: true,
    buoi: [1, 8, 15].map((d) => ({ ngayTrongThang: d, donGia: 400_000 })),
  },
];

/* ══════════════════════════════════ lớp ══════════════════════════════════ */

export const LOP: LopMau[] = [
  { ma: "L-TOAN-01", ten: "Toán tư duy HSA — ca tối T3-T5", mon: "Toán", hocPhiMoiBuoi: 300_000, hocPhiCaKhoa: null },
  { ma: "L-VAN-01", ten: "Ngữ văn HSA — ca sáng T7", mon: "Ngữ văn", hocPhiMoiBuoi: null, hocPhiCaKhoa: 6_000_000 },
  // LỖI GIEO 4: lớp không ghi môn.
  { ma: "L-TONGON-01", ten: "Lớp ôn tổng hợp cuối tuần", mon: null, hocPhiMoiBuoi: 350_000, hocPhiCaKhoa: null },
  // LỖI GIEO 5: lớp không ghi mức thu.
  { ma: "L-THU-01", ten: "Lớp thử — chưa chốt học phí", mon: "Tiếng Anh", hocPhiMoiBuoi: null, hocPhiCaKhoa: null },
];

/* ═══════════════════════════════ sổ thu chi ══════════════════════════════ */

export const THU: ThuMau[] = [
  { ngayTrongThang: 3, soTien: 12_000_000, moTa: "Học phí lớp Toán tư duy — 40 lượt", dienThue: "khong_chiu", dienKeKhai: "da_ke_khai" },
  { ngayTrongThang: 5, soTien: 6_000_000, moTa: "Học phí lớp Ngữ văn — 1 khoá", dienThue: "khong_chiu", dienKeKhai: "da_ke_khai" },
  // Bán tài liệu CHỊU thuế 10% — đúng ranh giới mục 2.2, chỗ nhiều trung tâm khai nhầm.
  { ngayTrongThang: 8, soTien: 2_400_000, moTa: "Bán bộ đề luyện HSA", dienThue: "gtgt_10", dienKeKhai: "da_ke_khai" },
  // LỖI GIEO 6, 7, 8: ba dòng CHƯA AI QUYẾT kê khai hay không.
  { ngayTrongThang: 12, soTien: 4_500_000, moTa: "Học phí lớp ôn tổng hợp", dienThue: "khong_chiu", dienKeKhai: "chua_quyet" },
  { ngayTrongThang: 18, soTien: 1_800_000, moTa: "Bán tài liệu lẻ tại quầy", dienThue: "chua_quyet", dienKeKhai: "chua_quyet" },
  { ngayTrongThang: 24, soTien: 3_000_000, moTa: "Học phí đóng bù kỳ trước", dienThue: "khong_chiu", dienKeKhai: "chua_quyet" },
];

export const CHI: ChiMau[] = [
  { ngayTrongThang: 5, soTien: 18_000_000, moTa: "Thuê mặt bằng", nhom: "thue_mat_bang", duocTru: true },
  { ngayTrongThang: 6, soTien: 2_400_000, moTa: "Điện nước", nhom: "dien_nuoc", duocTru: true },
  { ngayTrongThang: 10, soTien: 5_000_000, moTa: "Chạy quảng cáo tuyển sinh", nhom: "marketing", duocTru: true },
  // LỖI GIEO 9: chi không hoá đơn → KHÔNG được trừ khi tính TNDN.
  {
    ngayTrongThang: 15,
    soTien: 3_200_000,
    moTa: "Mua bàn ghế tại cửa hàng lẻ",
    nhom: "thiet_bi",
    duocTru: false,
    lyDoKhongTru: "Không có hoá đơn hợp lệ",
  },
];

/* ══════════════════════════════ hồ sơ TT29 ═══════════════════════════════
 * Khai ĐÃ CÔNG KHAI cả sáu mục. Nhưng dữ liệu ở trên nói khác — và đó chính là
 * chỗ bộ soi phải bắt được. Đây là kịch bản thật hay gặp nhất: đánh dấu cho
 * xong rồi quên mất bản công khai đã cũ.
 * ═════════════════════════════════════════════════════════════════════════ */

export const TT29_TRANG_THAI = "da_cong_khai" as const;

/* ════════════════════════════════ ĐÁP ÁN ════════════════════════════════ */

/**
 * Những gì các bộ soi PHẢI tìm ra trên bộ mẫu này — không hơn, không kém.
 * `tests/duLieuMau.test.ts` chấm đúng bảng này.
 */
export const DAP_AN = {
  /** GV-04 và GV-05 */
  soGiaoVienChuaCongKhai: 2,
  /** GV-02 và GV-03 */
  soGiaoVienTruongCong: 2,
  /** chỉ GV-02 */
  soGvTruongCongChuaBaoCao: 1,
  /** L-TONGON-01 */
  soLopThieuMon: 1,
  /** L-THU-01 */
  soLopThieuHocPhi: 1,

  /** TT29: khai đủ 6 mục nhưng lệch ở danh sách người dạy, môn học, học phí */
  soLechTt29: 3,
  sanSangTuyenSinh: false,

  /** Sổ thu chi */
  tongThu: 29_700_000,
  tongChi: 28_600_000,
  lai: 1_100_000,
  thuDaKeKhai: 20_400_000,
  soDongThuChuaQuyet: 3,
  thuChuaQuyet: 9_300_000,
  chiDuocTru: 25_400_000,

  /** Thù lao — hai ca đối nghịch để chứng minh ngưỡng chạy đúng */
  thuLao: {
    "GV-01": { tong: 5_000_000, khauTru: 500_000, thucNhan: 4_500_000, apDungKhauTru: true },
    "GV-06": { tong: 1_200_000, khauTru: 0, thucNhan: 1_200_000, apDungKhauTru: false },
  },
} as const;
