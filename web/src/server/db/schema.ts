/**
 * Lược đồ ANSER-HSA.
 *
 * Sáu bài học mang từ ERD_CHUAN.md của dự án Hoàng Phát, áp từ migration đầu:
 *   1. Số lượng lẻ dùng `numeric`, không `integer` — 15% dòng dữ liệu thật có số lẻ
 *   2. Sổ, không phải số dư — đã thu bao nhiêu thì SUM từ sổ thu, không lưu cột
 *   3. Ràng buộc ở tầng DB bằng CHECK, không phải ghi chú trong code
 *   4. Mọi phiếu nối được về chứng từ gốc bằng cặp `nguon_loai` + `nguon_id`
 *   5. NULL = CHƯA BIẾT, khác hẳn 0
 *   6. Làm tròn tiền nửa lên, một hàm dùng chung
 *
 * Tiền VND dùng `bigint`: không có phần lẻ, nhưng `integer` trần 2,147 tỷ —
 * một trung tâm luyện thi vượt được trần đó, và tràn số tiền là loại lỗi im lặng.
 *
 * Cột `nguon` có mặt trên MỌI bảng nghiệp vụ. Khách tự nhập dữ liệu thật xen vào
 * giữa dữ liệu mẫu ngay buổi đầu, nên xoá mẫu phải là `DELETE WHERE nguon='mau'`
 * chứ không phải xoá theo ngày tạo. Nó cũng là thứ cổng gửi đọc để từ chối nhắn
 * tin thật bằng số liệu giả.
 */

import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  date,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

/** Dùng lại trên mọi bảng nghiệp vụ. 'mau' = dữ liệu gieo sẵn, 'that' = khách nhập. */
const nguon = () => text("nguon").notNull().default("that");
const nguonCheck = (t: string) =>
  check(`${t}_nguon_hop_le`, sql`nguon in ('mau','that')`);

const taoLuc = () => timestamp("tao_luc", { withTimezone: true }).notNull().defaultNow();

/* ════════════════════════════════ tài khoản ════════════════════════════════ */

export const nguoiDung = pgTable(
  "nguoi_dung",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ho: text("ho").notNull(),
    ten: text("ten").notNull(),
    email: text("email").notNull().unique(),
    dienThoai: text("dien_thoai"),
    matKhauHash: text("mat_khau_hash").notNull(),
    // Bốn cấp. Thù lao giáo viên là dữ liệu nhạy cảm nội bộ — trợ giảng không
    // được nhìn thấy, nên phân quyền không còn là thứ hoãn được như bên Body.
    vaiTro: text("vai_tro").notNull().default("tro_giang"),
    nhanVienId: uuid("nhan_vien_id"),
    taoLuc: taoLuc(),
  },
  (t) => [
    check("nguoi_dung_vai_tro_hop_le", sql`${t.vaiTro} in ('tro_giang','ke_toan','quan_ly','admin')`),
  ],
);

/**
 * Phiên đăng nhập. Body không có bảng này: token JWT 7 ngày, không thu hồi được.
 * Nghỉ việc một trợ giảng thì cách duy nhất để đuổi họ ra là đổi JWT_SECRET —
 * tức là đăng xuất toàn bộ công ty. Với sản phẩm giữ dữ liệu học viên dưới Luật
 * 91/2025, thu hồi từng phiên là bắt buộc chứ không phải tiện nghi.
 */
export const phienDangNhap = pgTable("phien_dang_nhap", {
  id: uuid("id").primaryKey().defaultRandom(),
  nguoiDungId: uuid("nguoi_dung_id").notNull().references(() => nguoiDung.id, { onDelete: "cascade" }),
  jti: text("jti").notNull().unique(),
  hetHanLuc: timestamp("het_han_luc", { withTimezone: true }).notNull(),
  thuHoiLuc: timestamp("thu_hoi_luc", { withTimezone: true }),
  diaChiIp: text("dia_chi_ip"),
  trinhDuyet: text("trinh_duyet"),
  taoLuc: taoLuc(),
});

/** Đếm lần đăng nhập hỏng để chặn dò mật khẩu. Dọn định kỳ, không giữ lâu. */
export const lanDangNhapHong = pgTable("lan_dang_nhap_hong", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull(),
  diaChiIp: text("dia_chi_ip"),
  taoLuc: taoLuc(),
});

/* ═══════════════════════════ tham số pháp lý ═══════════════════════════════
 * Đổi luật là THÊM MỘT DÒNG, không sửa code. Ngưỡng khấu trừ 10% đang có dự
 * thảo nâng lên (hai con số đang lưu hành: 3 triệu và 5 triệu), giảm trừ gia
 * cảnh vừa đổi, biểu thuế vừa từ 7 bậc xuống 5. Hardcode bất kỳ số nào trong
 * nhóm này là hẹn trước một lần sửa code.
 * ═════════════════════════════════════════════════════════════════════════ */

export const thamSoPhapLy = pgTable(
  "tham_so_phap_ly",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ma: text("ma").notNull(),
    giaTri: numeric("gia_tri", { precision: 18, scale: 4 }).notNull(),
    donVi: text("don_vi").notNull(), // 'vnd' | 'phan_tram' | 'lan'
    hieuLucTu: date("hieu_luc_tu").notNull(),
    hieuLucDen: date("hieu_luc_den"), // NULL = còn hiệu lực
    nguonVanBan: text("nguon_van_ban").notNull(),
    ghiChu: text("ghi_chu"),
    /**
     * Số này do máy tra về, chưa có kế toán thật nhìn.
     *
     * Chiến lược §6 xếp "chưa từng làm kế toán ngành giáo dục" là rủi ro Cao và
     * nói rõ vòng đầu cần một kế toán rà lại. Cột này biến câu đó thành thứ hệ
     * thống biết: mọi bảng tính từ tham số chưa duyệt đều phải đóng dấu, thay
     * vì trông y hệt bảng đã được kiểm.
     */
    daDuyet: boolean("da_duyet").notNull().default(false),
    duyetBoiId: uuid("duyet_boi_id"),
    duyetLuc: timestamp("duyet_luc", { withTimezone: true }),
    taoLuc: taoLuc(),
  },
  (t) => [
    unique("tham_so_ma_hieu_luc").on(t.ma, t.hieuLucTu),
    check("tham_so_don_vi_hop_le", sql`${t.donVi} in ('vnd','phan_tram','lan')`),
    check("tham_so_khoang_hop_le", sql`${t.hieuLucDen} is null or ${t.hieuLucDen} > ${t.hieuLucTu}`),
    // Đã duyệt thì phải biết ai duyệt và duyệt lúc nào, không thì "đã duyệt"
    // chỉ là một ô tích không truy được về ai.
    check(
      "tham_so_duyet_du_dau_vet",
      sql`${t.daDuyet} = false or (${t.duyetLuc} is not null and ${t.duyetBoiId} is not null)`,
    ),
  ],
);

/** Biểu thuế luỹ tiến — bảng riêng vì nó là dải, không phải một con số. */
export const bacThueTncn = pgTable(
  "bac_thue_tncn",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bac: integer("bac").notNull(),
    tuThuNhap: bigint("tu_thu_nhap", { mode: "number" }).notNull(),
    denThuNhap: bigint("den_thu_nhap", { mode: "number" }), // NULL = bậc cuối, không trần
    thueSuat: numeric("thue_suat", { precision: 5, scale: 2 }).notNull(),
    hieuLucTu: date("hieu_luc_tu").notNull(),
    hieuLucDen: date("hieu_luc_den"),
    nguonVanBan: text("nguon_van_ban").notNull(),
    daDuyet: boolean("da_duyet").notNull().default(false),
    duyetBoiId: uuid("duyet_boi_id"),
    duyetLuc: timestamp("duyet_luc", { withTimezone: true }),
  },
  (t) => [
    unique("bac_thue_bac_hieu_luc").on(t.bac, t.hieuLucTu),
    check("bac_thue_dai_hop_le", sql`${t.denThuNhap} is null or ${t.denThuNhap} > ${t.tuThuNhap}`),
    check(
      "bac_thue_duyet_du_dau_vet",
      sql`${t.daDuyet} = false or (${t.duyetLuc} is not null and ${t.duyetBoiId} is not null)`,
    ),
  ],
);

/* ══════════════════ đồng ý xử lý dữ liệu — Luật 91/2025 ═══════════════════
 * Hiệu lực 01/01/2026. Gửi tin cho phụ huynh là xử lý dữ liệu cá nhân của
 * người thứ ba. Cổng gửi ĐỌC BẢNG NÀY trước mỗi lần gửi; không có dòng đồng ý
 * còn hiệu lực thì không gửi. Thêm sau nghĩa là đi xin lại chữ ký của cả trăm
 * phụ huynh.
 * ═════════════════════════════════════════════════════════════════════════ */

export const dongYDuLieu = pgTable(
  "dong_y_du_lieu",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    chuTheLoai: text("chu_the_loai").notNull(), // 'hoc_vien' | 'phu_huynh' | 'giao_vien' | 'nhan_vien'
    chuTheId: uuid("chu_the_id").notNull(),
    phamVi: text("pham_vi").notNull(), // 'nhan_thong_bao' | 'luu_tru_ho_so' | 'cong_khai_ds_nguoi_day'
    thoiDiem: timestamp("thoi_diem", { withTimezone: true }).notNull(),
    nguonDongY: text("nguon_dong_y").notNull(), // 'ban_giay' | 'zalo' | 'email' | 'tren_app'
    // Trẻ dưới 16 cần đồng ý của cả người đại diện theo pháp luật.
    nguoiDaiDienHoTen: text("nguoi_dai_dien_ho_ten"),
    rutLaiLuc: timestamp("rut_lai_luc", { withTimezone: true }),
    ghiChu: text("ghi_chu"),
    nguon: nguon(),
    taoLuc: taoLuc(),
  },
  (t) => [
    nguonCheck("dong_y_du_lieu"),
    check("dong_y_chu_the_hop_le", sql`${t.chuTheLoai} in ('hoc_vien','phu_huynh','giao_vien','nhan_vien')`),
    check("dong_y_nguon_hop_le", sql`${t.nguonDongY} in ('ban_giay','zalo','email','tren_app')`),
  ],
);

/* ════════════════════════════ học viên và lớp ═════════════════════════════ */

export const hocVien = pgTable(
  "hoc_vien",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ma: text("ma").notNull().unique(), // dùng làm nội dung chuyển khoản trên VietQR
    hoTen: text("ho_ten").notNull(),
    ngaySinh: date("ngay_sinh"), // NULL = chưa biết; quyết định có phải trẻ em không
    dienThoai: text("dien_thoai"),
    email: text("email"),
    truong: text("truong"),
    khoiLop: text("khoi_lop"),
    maNgoai: text("ma_ngoai"), // mã bên MISA EMIS nếu khách đang dùng
    ghiChu: text("ghi_chu"),
    nguon: nguon(),
    taoLuc: taoLuc(),
  },
  () => [nguonCheck("hoc_vien")],
);

export const phuHuynh = pgTable(
  "phu_huynh",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    hoTen: text("ho_ten").notNull(),
    dienThoai: text("dien_thoai"),
    email: text("email"),
    zaloId: text("zalo_id"),
    nguon: nguon(),
    taoLuc: taoLuc(),
  },
  () => [nguonCheck("phu_huynh")],
);

export const hocVienPhuHuynh = pgTable(
  "hoc_vien_phu_huynh",
  {
    hocVienId: uuid("hoc_vien_id").notNull().references(() => hocVien.id, { onDelete: "cascade" }),
    phuHuynhId: uuid("phu_huynh_id").notNull().references(() => phuHuynh.id, { onDelete: "cascade" }),
    quanHe: text("quan_he"), // 'bo' | 'me' | 'nguoi_giam_ho'
    laNguoiDaiDien: boolean("la_nguoi_dai_dien").notNull().default(false),
  },
  (t) => [unique("hoc_vien_phu_huynh_cap").on(t.hocVienId, t.phuHuynhId)],
);

export const lopHoc = pgTable(
  "lop_hoc",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ma: text("ma").notNull().unique(),
    ten: text("ten").notNull(),
    mon: text("mon").notNull(), // bắt buộc công khai theo TT29
    khoiLop: text("khoi_lop"),
    soBuoi: integer("so_buoi"),
    hocPhiMoiBuoi: bigint("hoc_phi_moi_buoi", { mode: "number" }), // NULL = thu trọn khoá
    hocPhiCaKhoa: bigint("hoc_phi_ca_khoa", { mode: "number" }),
    diaDiem: text("dia_diem"),
    hinhThuc: text("hinh_thuc"), // 'truc_tiep' | 'truc_tuyen'
    batDau: date("bat_dau"),
    ketThuc: date("ket_thuc"),
    nguon: nguon(),
    taoLuc: taoLuc(),
  },
  (t) => [
    nguonCheck("lop_hoc"),
    // Một trong hai cách thu phải có, nếu không thì không tính được học phí.
    check("lop_hoc_co_hoc_phi", sql`${t.hocPhiMoiBuoi} is not null or ${t.hocPhiCaKhoa} is not null`),
  ],
);

export const dangKy = pgTable(
  "dang_ky",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    hocVienId: uuid("hoc_vien_id").notNull().references(() => hocVien.id, { onDelete: "cascade" }),
    lopHocId: uuid("lop_hoc_id").notNull().references(() => lopHoc.id, { onDelete: "cascade" }),
    ngayDangKy: date("ngay_dang_ky").notNull(),
    // Học phí chốt LÚC ĐĂNG KÝ. Lớp đổi giá thì đăng ký cũ giữ nguyên giá cũ —
    // cùng lý do với snapshot đơn giá trên dòng hoá đơn.
    hocPhiApDung: bigint("hoc_phi_ap_dung", { mode: "number" }).notNull(),
    trangThai: text("trang_thai").notNull().default("dang_hoc"),
    nguon: nguon(),
    taoLuc: taoLuc(),
  },
  (t) => [
    nguonCheck("dang_ky"),
    unique("dang_ky_hoc_vien_lop").on(t.hocVienId, t.lopHocId),
    check("dang_ky_trang_thai_hop_le", sql`${t.trangThai} in ('dang_hoc','bao_luu','da_xong','da_huy')`),
  ],
);

export const buoiHoc = pgTable(
  "buoi_hoc",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    lopHocId: uuid("lop_hoc_id").notNull().references(() => lopHoc.id, { onDelete: "cascade" }),
    ngay: date("ngay").notNull(),
    gioBatDau: text("gio_bat_dau"),
    soGio: numeric("so_gio", { precision: 5, scale: 2 }), // buổi 1,5 giờ là chuyện thường
    giaoVienId: uuid("giao_vien_id"),
    trangThai: text("trang_thai").notNull().default("theo_lich"),
    nguon: nguon(),
    taoLuc: taoLuc(),
  },
  (t) => [
    nguonCheck("buoi_hoc"),
    check("buoi_hoc_trang_thai_hop_le", sql`${t.trangThai} in ('theo_lich','da_day','nghi','doi_lich')`),
  ],
);

/* ═════════════════════════════════ tiền vào ═══════════════════════════════ */

export const thuHocPhi = pgTable(
  "thu_hoc_phi",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    dangKyId: uuid("dang_ky_id").notNull().references(() => dangKy.id, { onDelete: "restrict" }),
    soTien: bigint("so_tien", { mode: "number" }).notNull(),
    ngayThu: date("ngay_thu").notNull(),
    hinhThuc: text("hinh_thuc").notNull(), // 'tien_mat' | 'chuyen_khoan' | 'vi'
    noiDungQr: text("noi_dung_qr"), // nội dung in trên VietQR, để khớp chính xác
    nguon: nguon(),
    taoLuc: taoLuc(),
  },
  (t) => [
    nguonCheck("thu_hoc_phi"),
    check("thu_hoc_phi_duong", sql`${t.soTien} > 0`),
    check("thu_hoc_phi_hinh_thuc_hop_le", sql`${t.hinhThuc} in ('tien_mat','chuyen_khoan','vi')`),
  ],
);

export const giaoDichNganHang = pgTable(
  "giao_dich_ngan_hang",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    maGiaoDich: text("ma_giao_dich").notNull().unique(), // chống nạp trùng khi tải lại sao kê
    ngay: timestamp("ngay", { withTimezone: true }).notNull(),
    soTien: bigint("so_tien", { mode: "number" }).notNull(),
    noiDung: text("noi_dung"),
    nganHang: text("ngan_hang"),
    soTaiKhoan: text("so_tai_khoan"),
    nguonNap: text("nguon_nap").notNull(), // 'sepay' | 'sao_ke'
    nguon: nguon(),
    taoLuc: taoLuc(),
  },
  (t) => [
    nguonCheck("giao_dich_ngan_hang"),
    check("giao_dich_nguon_nap_hop_le", sql`${t.nguonNap} in ('sepay','sao_ke')`),
  ],
);

export const khopThu = pgTable(
  "khop_thu",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    giaoDichId: uuid("giao_dich_id").notNull().references(() => giaoDichNganHang.id, { onDelete: "cascade" }),
    thuHocPhiId: uuid("thu_hoc_phi_id").references(() => thuHocPhi.id, { onDelete: "set null" }),
    // 'ma_qr' = khớp chính xác theo mã trên VietQR; 'suy_luan' = khớp mờ, cần người duyệt.
    cachKhop: text("cach_khop").notNull(),
    doTinCay: numeric("do_tin_cay", { precision: 4, scale: 3 }),
    nguoiDuyetId: uuid("nguoi_duyet_id").references(() => nguoiDung.id, { onDelete: "set null" }),
    duyetLuc: timestamp("duyet_luc", { withTimezone: true }),
    nguon: nguon(),
    taoLuc: taoLuc(),
  },
  (t) => [
    nguonCheck("khop_thu"),
    check("khop_cach_hop_le", sql`${t.cachKhop} in ('ma_qr','suy_luan','nguoi_gan')`),
    // Khớp mờ KHÔNG được coi là xong nếu chưa ai duyệt.
    check(
      "khop_suy_luan_phai_co_nguoi_duyet",
      sql`${t.cachKhop} <> 'suy_luan' or ${t.duyetLuc} is not null or ${t.thuHocPhiId} is null`,
    ),
  ],
);

export const bienLai = pgTable(
  "bien_lai",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    so: text("so").notNull().unique(),
    thuHocPhiId: uuid("thu_hoc_phi_id").notNull().references(() => thuHocPhi.id, { onDelete: "restrict" }),
    ngay: date("ngay").notNull(),
    daGuiLuc: timestamp("da_gui_luc", { withTimezone: true }),
    nguon: nguon(),
    taoLuc: taoLuc(),
  },
  () => [nguonCheck("bien_lai")],
);

export const hopDongDaoTao = pgTable(
  "hop_dong_dao_tao",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    so: text("so").notNull().unique(),
    hocVienId: uuid("hoc_vien_id").notNull().references(() => hocVien.id, { onDelete: "restrict" }),
    ngayKy: date("ngay_ky").notNull(),
    duongDanFile: text("duong_dan_file"),
    nguon: nguon(),
    taoLuc: taoLuc(),
  },
  () => [nguonCheck("hop_dong_dao_tao")],
);

/* ═══════════════════════════ nhân sự và tiền ra ═══════════════════════════ */

export const nhanVien = pgTable(
  "nhan_vien",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    hoTen: text("ho_ten").notNull(),
    chucVu: text("chuc_vu"),
    dienThoai: text("dien_thoai"),
    email: text("email"),
    maSoThue: text("ma_so_thue"),
    ngayVao: date("ngay_vao"),
    nguon: nguon(),
    taoLuc: taoLuc(),
  },
  () => [nguonCheck("nhan_vien")],
);

export const giaoVien = pgTable(
  "giao_vien",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Thỉnh giảng thì không có hồ sơ nhân sự — NULL, không phải bịa một dòng rỗng.
    nhanVienId: uuid("nhan_vien_id").references(() => nhanVien.id, { onDelete: "set null" }),
    hoTen: text("ho_ten").notNull(),
    mon: text("mon"),
    dienThoai: text("dien_thoai"),
    maSoThue: text("ma_so_thue"),
    loai: text("loai").notNull().default("thinh_giang"),
    // TT29: giáo viên trường công phải báo cáo hiệu trưởng, và KHÔNG được tham
    // gia quản lý điều hành. Hai cột này là đầu vào của soi_ho_so_tt29.
    laGvTruongCong: boolean("la_gv_truong_cong").notNull().default(false),
    daBaoCaoHieuTruong: boolean("da_bao_cao_hieu_truong").notNull().default(false),
    congKhaiDanhSach: boolean("cong_khai_danh_sach").notNull().default(false),
    nguon: nguon(),
    taoLuc: taoLuc(),
  },
  (t) => [
    nguonCheck("giao_vien"),
    check("giao_vien_loai_hop_le", sql`${t.loai} in ('co_huu','thinh_giang')`),
    check("giao_vien_co_huu_phai_co_ho_so", sql`${t.loai} <> 'co_huu' or ${t.nhanVienId} is not null`),
  ],
);

export const buoiDay = pgTable(
  "buoi_day",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    giaoVienId: uuid("giao_vien_id").notNull().references(() => giaoVien.id, { onDelete: "restrict" }),
    buoiHocId: uuid("buoi_hoc_id").references(() => buoiHoc.id, { onDelete: "set null" }),
    ngay: date("ngay").notNull(),
    soGio: numeric("so_gio", { precision: 5, scale: 2 }),
    donGia: bigint("don_gia", { mode: "number" }).notNull(), // theo buổi hoặc theo giờ
    tinhTheo: text("tinh_theo").notNull().default("buoi"),
    nguon: nguon(),
    taoLuc: taoLuc(),
  },
  (t) => [
    nguonCheck("buoi_day"),
    check("buoi_day_tinh_theo_hop_le", sql`${t.tinhTheo} in ('buoi','gio')`),
    check("buoi_day_theo_gio_phai_co_so_gio", sql`${t.tinhTheo} <> 'gio' or ${t.soGio} is not null`),
  ],
);

export const thuLao = pgTable(
  "thu_lao",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    giaoVienId: uuid("giao_vien_id").notNull().references(() => giaoVien.id, { onDelete: "restrict" }),
    ky: text("ky").notNull(), // 'YYYY-MM'
    tongTruocThue: bigint("tong_truoc_thue", { mode: "number" }).notNull(),
    khauTruTncn: bigint("khau_tru_tncn", { mode: "number" }).notNull().default(0),
    thucNhan: bigint("thuc_nhan", { mode: "number" }).notNull(),
    // Ghi lại NGƯỠNG đã dùng lúc tính. Ngưỡng đổi giữa chừng thì bảng cũ vẫn
    // giải thích được vì sao ra con số đó — không phải đi đoán lại.
    nguongApDung: bigint("nguong_ap_dung", { mode: "number" }).notNull(),
    coCamKet08: boolean("co_cam_ket_08").notNull().default(false),
    nguon: nguon(),
    taoLuc: taoLuc(),
  },
  (t) => [
    nguonCheck("thu_lao"),
    unique("thu_lao_giao_vien_ky").on(t.giaoVienId, t.ky),
    check("thu_lao_can_doi", sql`${t.thucNhan} = ${t.tongTruocThue} - ${t.khauTruTncn}`),
  ],
);

export const camKet08 = pgTable(
  "cam_ket_08",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    giaoVienId: uuid("giao_vien_id").notNull().references(() => giaoVien.id, { onDelete: "cascade" }),
    nam: integer("nam").notNull(),
    nopLuc: date("nop_luc"),
    duongDanFile: text("duong_dan_file"),
    nguon: nguon(),
    taoLuc: taoLuc(),
  },
  (t) => [nguonCheck("cam_ket_08"), unique("cam_ket_08_giao_vien_nam").on(t.giaoVienId, t.nam)],
);

export const hopDongLaoDong = pgTable(
  "hop_dong_lao_dong",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    so: text("so").notNull().unique(),
    nhanVienId: uuid("nhan_vien_id").notNull().references(() => nhanVien.id, { onDelete: "restrict" }),
    loai: text("loai").notNull(), // 'khong_xac_dinh' | 'xac_dinh' | 'duoi_3_thang'
    tuNgay: date("tu_ngay").notNull(),
    denNgay: date("den_ngay"), // NULL = không xác định thời hạn
    luongCoBan: bigint("luong_co_ban", { mode: "number" }).notNull(),
    luongDongBhxh: bigint("luong_dong_bhxh", { mode: "number" }),
    nguon: nguon(),
    taoLuc: taoLuc(),
  },
  (t) => [
    nguonCheck("hop_dong_lao_dong"),
    check("hdld_loai_hop_le", sql`${t.loai} in ('khong_xac_dinh','xac_dinh','duoi_3_thang')`),
    check("hdld_khoang_hop_le", sql`${t.denNgay} is null or ${t.denNgay} > ${t.tuNgay}`),
    check("hdld_khong_xac_dinh_khong_co_han", sql`${t.loai} <> 'khong_xac_dinh' or ${t.denNgay} is null`),
  ],
);

export const bhxhThamGia = pgTable(
  "bhxh_tham_gia",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    nhanVienId: uuid("nhan_vien_id").notNull().references(() => nhanVien.id, { onDelete: "cascade" }),
    soSoBhxh: text("so_so_bhxh"),
    thamGiaTu: date("tham_gia_tu").notNull(),
    ketThuc: date("ket_thuc"),
    nguon: nguon(),
    taoLuc: taoLuc(),
  },
  () => [nguonCheck("bhxh_tham_gia")],
);

export const nguoiPhuThuoc = pgTable(
  "nguoi_phu_thuoc",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    nhanVienId: uuid("nhan_vien_id").notNull().references(() => nhanVien.id, { onDelete: "cascade" }),
    hoTen: text("ho_ten").notNull(),
    quanHe: text("quan_he"),
    maSoThue: text("ma_so_thue"),
    giamTruTu: date("giam_tru_tu").notNull(),
    giamTruDen: date("giam_tru_den"),
    nguon: nguon(),
    taoLuc: taoLuc(),
  },
  () => [nguonCheck("nguoi_phu_thuoc")],
);

export const bangLuong = pgTable(
  "bang_luong",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    nhanVienId: uuid("nhan_vien_id").notNull().references(() => nhanVien.id, { onDelete: "restrict" }),
    ky: text("ky").notNull(), // 'YYYY-MM'
    luongThucTe: bigint("luong_thuc_te", { mode: "number" }).notNull(),
    luongDongBhxh: bigint("luong_dong_bhxh", { mode: "number" }).notNull(),
    bhxhNld: bigint("bhxh_nld", { mode: "number" }).notNull().default(0),
    bhxhDn: bigint("bhxh_dn", { mode: "number" }).notNull().default(0),
    giamTruBanThan: bigint("giam_tru_ban_than", { mode: "number" }).notNull(),
    giamTruPhuThuoc: bigint("giam_tru_phu_thuoc", { mode: "number" }).notNull().default(0),
    thuNhapTinhThue: bigint("thu_nhap_tinh_thue", { mode: "number" }).notNull().default(0),
    tncn: bigint("tncn", { mode: "number" }).notNull().default(0),
    thucNhan: bigint("thuc_nhan", { mode: "number" }).notNull(),
    nguon: nguon(),
    taoLuc: taoLuc(),
  },
  (t) => [
    nguonCheck("bang_luong"),
    unique("bang_luong_nhan_vien_ky").on(t.nhanVienId, t.ky),
    // Sàn đóng BHXH không được thấp hơn lương tối thiểu vùng — nhưng con số đó
    // đổi theo năm nên nó nằm ở tham_so_phap_ly, không CHECK cứng ở đây được.
    // Chỉ chặn được điều luôn đúng: lương đóng không vượt lương thực tế.
    check("bang_luong_dong_khong_vuot_thuc_te", sql`${t.luongDongBhxh} <= ${t.luongThucTe}`),
    check("bang_luong_can_doi", sql`${t.thucNhan} = ${t.luongThucTe} - ${t.bhxhNld} - ${t.tncn}`),
  ],
);

/* ═════════════════════════════ thuế và hồ sơ ══════════════════════════════ */

export const doanhThuPhanLoai = pgTable(
  "doanh_thu_phan_loai",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Cặp nguồn đa hình — bài học 4. Mọi dòng doanh thu truy được về chứng từ gốc.
    nguonLoai: text("nguon_loai").notNull(),
    nguonId: uuid("nguon_id").notNull(),
    soTien: bigint("so_tien", { mode: "number" }).notNull(),
    dienThue: text("dien_thue").notNull(), // 'khong_chiu' | 'gtgt_5' | 'gtgt_10'
    canCuPhapLy: text("can_cu_phap_ly").notNull(),
    /**
     * Trung tâm chạy hai sổ: sổ quản trị đầy đủ và sổ thuế nộp cơ quan, chênh
     * nhau ở doanh thu. Cột này GHI LẠI SỰ THẬT đó, không phải để giấu:
     *
     *  - Kho dữ liệu vẫn đầy đủ. Chủ trung tâm thấy CẢ HAI con số cạnh nhau,
     *    nên biết lãi thật là bao nhiêu — thứ hiện giờ không ai nói được.
     *  - Bản kết xuất sang MISA phải NÊU RÕ đã loại bao nhiêu dòng và tổng bao
     *    nhiêu. Không có đường nào tạo ra một bản xuất lặng lẽ bỏ dòng.
     *  - `doi_chieu_misa` chỉ đối chiếu trong phần 'da_ke_khai'. Đó mới đúng
     *    việc của nó: soi sai sót nhập liệu. Đối chiếu cả phần chưa kê khai chỉ
     *    sinh ra một danh sách mà không ai muốn nó tồn tại.
     *
     * 'chua_quyet' = chưa ai quyết, KHÁC 'chua_ke_khai' là đã quyết không kê.
     */
    dienKeKhai: text("dien_ke_khai").notNull().default("chua_quyet"),
    nguoiDuyetId: uuid("nguoi_duyet_id").references(() => nguoiDung.id, { onDelete: "set null" }),
    duyetLuc: timestamp("duyet_luc", { withTimezone: true }),
    nguon: nguon(),
    taoLuc: taoLuc(),
  },
  (t) => [
    nguonCheck("doanh_thu_phan_loai"),
    unique("doanh_thu_nguon").on(t.nguonLoai, t.nguonId),
    check("doanh_thu_nguon_loai_hop_le", sql`${t.nguonLoai} in ('thu_hoc_phi','ban_tai_lieu','cho_thue','khac')`),
    check("doanh_thu_dien_hop_le", sql`${t.dienThue} in ('khong_chiu','gtgt_5','gtgt_10')`),
    check(
      "doanh_thu_dien_ke_khai_hop_le",
      sql`${t.dienKeKhai} in ('da_ke_khai','chua_ke_khai','chua_quyet')`,
    ),
  ],
);

/* ══════════════════════════ kho chứng từ và tài liệu ══════════════════════
 * Chị Mai: "HSA chỉ là của ai người đó giữ trên máy cá nhân và gg drive của
 * doanh nghiệp" — chứng từ, hợp đồng, bản xuất MISA nằm rải rác, không ai tìm
 * lại được. Đây là mảng chiến lược v1 và v2 đều không có, mà lại là nỗi đau
 * khách tự nói ra trước.
 * ═════════════════════════════════════════════════════════════════════════ */

export const taiLieu = pgTable(
  "tai_lieu",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ten: text("ten").notNull(),
    loai: text("loai").notNull(),
    // 'YYYY-MM' hoặc 'YYYY'. NULL = tài liệu không thuộc kỳ nào (giấy phép, điều lệ).
    ky: text("ky"),
    // Nối về bản ghi nghiệp vụ nếu có — bài học 4, cặp nguồn đa hình.
    nguonLoai: text("nguon_loai"),
    nguonId: uuid("nguon_id"),
    duongDan: text("duong_dan").notNull(),
    dinhDang: text("dinh_dang"),
    kichThuoc: bigint("kich_thuoc", { mode: "number" }),
    // Băm nội dung — tải lại đúng file cũ thì báo trùng thay vì nhân đôi kho.
    bamNoiDung: text("bam_noi_dung"),
    nguoiTaiLenId: uuid("nguoi_tai_len_id").references(() => nguoiDung.id, { onDelete: "set null" }),
    ghiChu: text("ghi_chu"),
    nguon: nguon(),
    taoLuc: taoLuc(),
  },
  (t) => [
    nguonCheck("tai_lieu"),
    unique("tai_lieu_bam").on(t.bamNoiDung),
    check(
      "tai_lieu_loai_hop_le",
      sql`${t.loai} in ('chung_tu','hop_dong','ban_xuat_misa','to_khai','giay_phep','sao_ke','khac')`,
    ),
    check(
      "tai_lieu_nguon_du_cap",
      sql`(${t.nguonLoai} is null) = (${t.nguonId} is null)`,
    ),
  ],
);

/** Sáu mục TT29 bắt buộc công khai trước khi tuyển sinh. Đầu vào soi_ho_so_tt29. */
export const hoSoTt29 = pgTable(
  "ho_so_tt29",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    muc: text("muc").notNull().unique(),
    trangThai: text("trang_thai").notNull().default("thieu"),
    congKhaiTai: text("cong_khai_tai"), // URL hoặc "niêm yết tại trụ sở"
    capNhatLuc: timestamp("cap_nhat_luc", { withTimezone: true }),
    ghiChu: text("ghi_chu"),
    nguon: nguon(),
    taoLuc: taoLuc(),
  },
  (t) => [
    nguonCheck("ho_so_tt29"),
    check(
      "tt29_muc_hop_le",
      sql`${t.muc} in ('mon_hoc','thoi_luong_theo_khoi','dia_diem_hinh_thuc_thoi_gian','danh_sach_nguoi_day','muc_thu_hoc_phi','dang_ky_kinh_doanh')`,
    ),
    check("tt29_trang_thai_hop_le", sql`${t.trangThai} in ('thieu','dang_lam','da_cong_khai')`),
  ],
);

export const nghiaVu = pgTable(
  "nghia_vu",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    loai: text("loai").notNull(), // 'gtgt' | 'tncn' | 'tndn' | 'bhxh' | 'bctc' | 'tt29'
    ky: text("ky").notNull(),
    hanNop: date("han_nop").notNull(),
    trangThai: text("trang_thai").notNull().default("chua_nop"),
    nhacLuc: timestamp("nhac_luc", { withTimezone: true }),
    nguon: nguon(),
    taoLuc: taoLuc(),
  },
  (t) => [
    nguonCheck("nghia_vu"),
    unique("nghia_vu_loai_ky").on(t.loai, t.ky),
    check("nghia_vu_trang_thai_hop_le", sql`${t.trangThai} in ('chua_nop','da_nop','tre_han')`),
  ],
);

/* ════════════════════════════ hệ thống và n8n ═════════════════════════════ */

export const caiDatCongTy = pgTable("cai_dat_cong_ty", {
  id: uuid("id").primaryKey().defaultRandom(),
  ten: text("ten").notNull().default("ANSER-HSA"),
  diaChi: text("dia_chi"),
  dienThoai: text("dien_thoai"),
  email: text("email"),
  maSoThue: text("ma_so_thue"),
  // Quyết định sàn đóng BHXH. Hà Nội nội thành là vùng I.
  vungLuongToiThieu: integer("vung_luong_toi_thieu").notNull().default(1),
  capNhatLuc: timestamp("cap_nhat_luc", { withTimezone: true }).notNull().defaultNow(),
});

export const quyTacTuDong = pgTable(
  "quy_tac_tu_dong",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ten: text("ten").notNull(),
    loai: text("loai").notNull(),
    bat: boolean("bat").notNull().default(true),
    n8nWorkflowId: text("n8n_workflow_id"),
    chayLanCuoi: timestamp("chay_lan_cuoi", { withTimezone: true }),
    trangThaiLanCuoi: text("trang_thai_lan_cuoi"),
    taoLuc: taoLuc(),
  },
  (t) => [
    check(
      "quy_tac_loai_hop_le",
      sql`${t.loai} in ('nhac_han_nghia_vu','nhac_hoc_phi','nhac_ho_so_tt29','nhac_cam_ket_08','bao_cao_thang')`,
    ),
  ],
);
