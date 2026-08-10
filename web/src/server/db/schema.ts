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
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import {
  bigint,
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
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

/** Kỳ luôn là 'YYYY-MM'. Không CHECK thì một chữ "T7/2026" lọt vào là mọi báo cáo
 *  theo kỳ âm thầm bỏ sót dòng đó — không lỗi, chỉ thiếu. */
const kyCheck = (ten: string, cot: string) =>
  check(`${ten}_ky_dung_dinh_dang`, sql.raw(`${cot} ~ '^[0-9]{4}-[0-9]{2}$'`));

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
    nhanVienId: uuid("nhan_vien_id").references((): AnyPgColumn => nhanVien.id, {
      onDelete: "set null",
    }),
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
    duyetBoiId: uuid("duyet_boi_id").references((): AnyPgColumn => nguoiDung.id, {
      onDelete: "set null",
    }),
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
    duyetBoiId: uuid("duyet_boi_id").references((): AnyPgColumn => nguoiDung.id, {
      onDelete: "set null",
    }),
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
    // UNIQUE: đồng bộ EMIS hai lần mà không có ràng buộc này là tạo ra học viên
    // trùng, và tiền học phí khớp vào đúng một nửa trong hai bản ghi đó.
    maNgoai: text("ma_ngoai").unique(),
    ghiChu: text("ghi_chu"),
    // 5.4 — Luật 91/2025. Ẩn danh hoá chứ không xoá: xoá học viên là thủng sổ kế
    // toán, giữ nguyên là vi phạm quyền yêu cầu xoá. Ẩn danh thoả cả hai.
    anDanhLuc: timestamp("an_danh_luc", { withTimezone: true }),
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
    anDanhLuc: timestamp("an_danh_luc", { withTimezone: true }),
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
  (t) => [primaryKey({ columns: [t.hocVienId, t.phuHuynhId] })],
);

export const lopHoc = pgTable(
  "lop_hoc",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ma: text("ma").notNull().unique(),
    ten: text("ten").notNull(),
    // NULLABLE có chủ đích, dù TT29 bắt buộc công khai môn học.
    //
    // Lớp chưa ghi môn là trạng thái KHÔNG TUÂN THỦ — và đó chính là thứ
    // soi_ho_so_tt29 sinh ra để phát hiện. Ép NOT NULL ở đây thì hệ thống
    // không biểu diễn nổi trạng thái sai, nên bộ soi không bao giờ bắt được nó.
    mon: text("mon"),
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
    // BỎ ràng buộc "phải có một trong hai cách thu".
    //
    // Nó tưởng là chặt chẽ nhưng thật ra chặn đúng thứ cần phát hiện: TT29 bắt
    // công khai mức thu học phí, nên "lớp chưa chốt học phí" là một vi phạm có
    // thật và hay gặp. Ràng buộc làm trạng thái đó không biểu diễn được, kéo
    // theo soi_ho_so_tt29 không bao giờ đếm ra nó — và bộ dữ liệu mẫu không
    // gieo nổi lỗi đó để chứng minh bộ soi chạy.
    //
    // Bài học: một ràng buộc khiến trạng thái sai KHÔNG BIỂU DIỄN ĐƯỢC cũng
    // khiến nó KHÔNG PHÁT HIỆN ĐƯỢC. Chỗ nào phần mềm có nhiệm vụ soi lỗi thì
    // chỗ đó phải chứa được lỗi.
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
    giaoVienId: uuid("giao_vien_id").references((): AnyPgColumn => giaoVien.id, {
      onDelete: "set null",
    }),
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
    // A3 — sao kê có CẢ tiền vào lẫn tiền ra. Không có cột này thì nạp một tháng
    // xong, doanh thu bị thổi phồng bằng đúng số tiền đã chi ra.
    chieu: text("chieu").notNull(),
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
    check("giao_dich_chieu_hop_le", sql`${t.chieu} in ('vao','ra')`),
    check("giao_dich_so_tien_duong", sql`${t.soTien} > 0`),
  ],
);

export const khopThu = pgTable(
  "khop_thu",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    giaoDichId: uuid("giao_dich_id").notNull().references(() => giaoDichNganHang.id, { onDelete: "cascade" }),
    // A1 — trỏ về SỔ TỔNG chứ không riêng học phí: khớp tiền là khớp với một
    // khoản thu, mà từ 5.1 mọi khoản thu đều nằm trong `khoan_thu`.
    khoanThuId: uuid("khoan_thu_id").references((): AnyPgColumn => khoanThu.id, {
      onDelete: "set null",
    }),
    /**
     * A1 — SỐ TIỀN ĐƯỢC PHÂN BỔ, không phải toàn bộ giao dịch.
     *
     * Thiếu cột này thì mô hình là 1–1 và hai tình huống thường gặp nhất không
     * diễn tả nổi: phụ huynh chuyển một lần cho HAI con, và một khoản học phí
     * đóng làm BA lần. Trung tâm nào có anh chị em học cùng là dính ngay.
     */
    soTien: bigint("so_tien", { mode: "number" }).notNull(),
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
    check("khop_so_tien_duong", sql`${t.soTien} > 0`),
    check(
      "khop_suy_luan_phai_co_nguoi_duyet",
      sql`${t.cachKhop} <> 'suy_luan' or ${t.duyetLuc} is not null or ${t.khoanThuId} is null`,
    ),
    index("khop_theo_giao_dich").on(t.giaoDichId),
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
    // A4 — không có cột này thì giáo viên hỏi "sao tháng này em được ngần này"
    // mà không ai mở ra được danh sách buổi. Một buổi thuộc tối đa một bảng.
    thuLaoId: uuid("thu_lao_id").references((): AnyPgColumn => thuLao.id, {
      onDelete: "set null",
    }),
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
    kyCheck("thu_lao", "ky"),
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
    // C5 — bảng lương thật có ba khoản này. CHECK cũ bỏ qua chúng nên mọi bảng
    // có phụ cấp đều vi phạm ràng buộc và không ghi được.
    phuCap: bigint("phu_cap", { mode: "number" }).notNull().default(0),
    thuong: bigint("thuong", { mode: "number" }).notNull().default(0),
    khauTruKhac: bigint("khau_tru_khac", { mode: "number" }).notNull().default(0),
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
    kyCheck("bang_luong", "ky"),
    check(
      "bang_luong_can_doi",
      sql`${t.thucNhan} = ${t.luongThucTe} + ${t.phuCap} + ${t.thuong} - ${t.bhxhNld} - ${t.tncn} - ${t.khauTruKhac}`,
    ),
  ],
);

/* ═════════════════════════════ thuế và hồ sơ ══════════════════════════════ */

/* ═══════════════════════ sổ thu chi — một sổ duy nhất ═════════════════════
 * Quyết định 5.1. `khoan_thu` là SỔ TỔNG: học phí nhập tay bây giờ ghi thẳng
 * vào đây, tới GĐ5 khi có `thu_hoc_phi` nối đăng ký và VietQR thì nó cũng ghi
 * vào cùng sổ với nguon_loai='thu_hoc_phi'.
 *
 * Vì sao một sổ chứ không hai: mọi báo cáo doanh thu cộng ở MỘT nơi. Hai sổ
 * nghĩa là mỗi câu hỏi doanh thu đều phải nhớ cộng cả hai, và quên một vế là
 * loại lỗi ra số nhỏ hơn thực tế mà không có gì báo.
 * ═════════════════════════════════════════════════════════════════════════ */

export const khoanThu = pgTable(
  "khoan_thu",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ngay: date("ngay").notNull(),
    ky: text("ky").notNull(), // 'YYYY-MM', suy từ `ngay` lúc ghi
    soTien: bigint("so_tien", { mode: "number" }).notNull(),
    moTa: text("mo_ta"),
    /**
     * Quyết định 5.2 — diện thuế nằm TRÊN DÒNG.
     *
     * Một phiếu thu gồm học phí (không chịu) và bán tài liệu (10%) được nhập
     * thành HAI dòng ngay từ đầu, đúng cách kế toán ghi sổ. Mô hình cũ khoá mỗi
     * chứng từ vào đúng một diện, buộc kế toán chọn một: chọn 'khong_chiu' là
     * khai thiếu, chọn 'gtgt_10' là nộp thừa. Cả hai đều sai và không ai thấy.
     */
    dienThue: text("dien_thue").notNull().default("chua_quyet"),
    /** Hai sổ — xem ghi chú dài ở `can_cu_dien_thue`. Mặc định CHƯA AI QUYẾT. */
    dienKeKhai: text("dien_ke_khai").notNull().default("chua_quyet"),
    // Cặp nguồn đa hình — bài học 4. 'tu_nhap' = gõ tay, chưa có chứng từ trong hệ thống.
    nguonLoai: text("nguon_loai").notNull().default("tu_nhap"),
    nguonId: uuid("nguon_id"),
    nguon: nguon(),
    taoLuc: taoLuc(),
  },
  (t) => [
    nguonCheck("khoan_thu"),
    kyCheck("khoan_thu", "ky"),
    check("khoan_thu_so_tien_duong", sql`${t.soTien} > 0`),
    check("khoan_thu_dien_hop_le", sql`${t.dienThue} in ('khong_chiu','gtgt_5','gtgt_10','chua_quyet')`),
    check(
      "khoan_thu_ke_khai_hop_le",
      sql`${t.dienKeKhai} in ('da_ke_khai','chua_ke_khai','chua_quyet')`,
    ),
    check(
      "khoan_thu_nguon_loai_hop_le",
      sql`${t.nguonLoai} in ('tu_nhap','thu_hoc_phi','ban_tai_lieu','cho_thue','khac')`,
    ),
    // Gõ tay thì không có chứng từ để trỏ; mọi nguồn khác thì bắt buộc có.
    check("khoan_thu_nguon_du_cap", sql`(${t.nguonLoai} = 'tu_nhap') = (${t.nguonId} is null)`),
    index("khoan_thu_theo_ky").on(t.ky),
    index("khoan_thu_theo_ngay").on(t.ngay),
  ],
);

export const khoanChi = pgTable(
  "khoan_chi",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ngay: date("ngay").notNull(),
    ky: text("ky").notNull(),
    soTien: bigint("so_tien", { mode: "number" }).notNull(),
    moTa: text("mo_ta"),
    nhom: text("nhom").notNull(),
    /**
     * Song song với `dien_ke_khai` bên doanh thu.
     *
     * Chi phí không có hoá đơn hợp lệ thì KHÔNG được trừ khi tính thuế TNDN.
     * Mặc định `false`: chưa chứng minh được thì chưa trừ, chứ không phải cứ
     * chi là trừ. Đoán ngược lại là khai thiếu thuế.
     */
    duocTru: boolean("duoc_tru").notNull().default(false),
    lyDoKhongTru: text("ly_do_khong_tru"),
    nguonLoai: text("nguon_loai").notNull().default("tu_nhap"),
    nguonId: uuid("nguon_id"),
    nguon: nguon(),
    taoLuc: taoLuc(),
  },
  (t) => [
    nguonCheck("khoan_chi"),
    kyCheck("khoan_chi", "ky"),
    check("khoan_chi_so_tien_duong", sql`${t.soTien} > 0`),
    check(
      "khoan_chi_nhom_hop_le",
      sql`${t.nhom} in ('thue_mat_bang','dien_nuoc','thu_lao','luong','marketing','thiet_bi','van_phong_pham','khac')`,
    ),
    check(
      "khoan_chi_nguon_loai_hop_le",
      sql`${t.nguonLoai} in ('tu_nhap','thu_lao','bang_luong','khac')`,
    ),
    check("khoan_chi_nguon_du_cap", sql`(${t.nguonLoai} = 'tu_nhap') = (${t.nguonId} is null)`),
    index("khoan_chi_theo_ky").on(t.ky),
    index("khoan_chi_theo_ngay").on(t.ngay),
  ],
);

/**
 * Quyết định 5.2 — bảng này KHÔNG còn giữ số tiền hay diện thuế nữa.
 *
 * Diện thuế đã nằm trên `khoan_thu`. Ở đây chỉ ghi **vì sao** xếp vào diện đó
 * và **ai** chịu trách nhiệm, cho những dòng cần giải trình. 90% dòng học phí
 * là "không chịu thuế" hiển nhiên — ép mỗi dòng một bản ghi căn cứ chỉ tạo rác.
 *
 * Về hai sổ: kho dữ liệu vẫn đầy đủ, chủ trung tâm thấy CẢ HAI con số cạnh
 * nhau. Bản kết xuất sang MISA phải nêu rõ đã loại bao nhiêu dòng và tổng bao
 * nhiêu — không có đường nào tạo ra một bản xuất lặng lẽ bỏ dòng. Và
 * `doi_chieu_misa` chỉ đối chiếu trong phần 'da_ke_khai', để nó làm đúng việc
 * soi sai sót nhập liệu thay vì sinh ra một danh sách không ai muốn tồn tại.
 */
export const canCuDienThue = pgTable(
  "can_cu_dien_thue",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    khoanThuId: uuid("khoan_thu_id")
      .notNull()
      .references(() => khoanThu.id, { onDelete: "cascade" }),
    canCuPhapLy: text("can_cu_phap_ly").notNull(),
    ghiChu: text("ghi_chu"),
    nguoiDuyetId: uuid("nguoi_duyet_id").references(() => nguoiDung.id, { onDelete: "set null" }),
    duyetLuc: timestamp("duyet_luc", { withTimezone: true }),
    taoLuc: taoLuc(),
  },
  (t) => [unique("can_cu_moi_khoan_thu_mot_dong").on(t.khoanThuId)],
);

/* ══════════════════════════ kho chứng từ và tài liệu ══════════════════════
 * Chị Mai: "HSA chỉ là của ai người đó giữ trên máy cá nhân và gg drive của
 * doanh nghiệp" — chứng từ, hợp đồng, bản xuất MISA nằm rải rác, không ai tìm
 * lại được. Nỗi đau khách tự nói ra trước khi được hỏi.
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
    check("tai_lieu_nguon_du_cap", sql`(${t.nguonLoai} is null) = (${t.nguonId} is null)`),
    index("tai_lieu_theo_ky").on(t.ky),
  ],
);

/* ═══════════════════ khoá kỳ và nhật ký — quyết định 5.3 ══════════════════ */

/**
 * Nộp tờ khai tháng 6 xong mà ai đó sửa một dòng tháng 6 thì số trong hệ thống
 * không còn khớp tờ khai đã nộp, và KHÔNG có gì báo.
 *
 * Với sản phẩm chạy hai sổ, phần chênh giữa sổ quản trị và sổ thuế chỉ có nghĩa
 * khi biết nó được chốt ở thời điểm nào.
 */
export const kyKeToan = pgTable(
  "ky_ke_toan",
  {
    ky: text("ky").primaryKey(),
    trangThai: text("trang_thai").notNull().default("mo"),
    khoaLuc: timestamp("khoa_luc", { withTimezone: true }),
    khoaBoiId: uuid("khoa_boi_id").references(() => nguoiDung.id, { onDelete: "set null" }),
    ghiChu: text("ghi_chu"),
    taoLuc: taoLuc(),
  },
  (t) => [
    kyCheck("ky_ke_toan", "ky"),
    check("ky_trang_thai_hop_le", sql`${t.trangThai} in ('mo','dang_chot','da_khoa')`),
    // Đã khoá thì phải biết ai khoá và khoá lúc nào — cùng lý do với `da_duyet`.
    check(
      "ky_khoa_du_dau_vet",
      sql`${t.trangThai} <> 'da_khoa' or (${t.khoaLuc} is not null and ${t.khoaBoiId} is not null)`,
    ),
  ],
);

/**
 * Append-only. Lời hứa "mọi con số truy được về chứng từ" mới chỉ đúng theo
 * chiều *bản ghi → chứng từ gốc*; bảng này lo chiều còn lại — *con số hôm nay
 * từng là gì*. Với hai sổ, chiều thứ hai mới là chiều người ta hỏi khi có chuyện.
 *
 * Cưỡng chế append-only bằng RULE ở tầng DB, viết tay trong migration 0003 —
 * drizzle không sinh được RULE.
 */
export const nhatKyThayDoi = pgTable(
  "nhat_ky_thay_doi",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bang: text("bang").notNull(),
    banGhiId: uuid("ban_ghi_id").notNull(),
    hanhDong: text("hanh_dong").notNull(),
    truoc: jsonb("truoc"),
    sau: jsonb("sau"),
    nguoiDungId: uuid("nguoi_dung_id").references(() => nguoiDung.id, { onDelete: "set null" }),
    taoLuc: taoLuc(),
  },
  (t) => [
    check("nhat_ky_hanh_dong_hop_le", sql`${t.hanhDong} in ('them','sua','xoa')`),
    // Thêm thì chưa có trạng thái trước; xoá thì không có trạng thái sau.
    check("nhat_ky_them_khong_co_truoc", sql`${t.hanhDong} <> 'them' or ${t.truoc} is null`),
    check("nhat_ky_xoa_khong_co_sau", sql`${t.hanhDong} <> 'xoa' or ${t.sau} is null`),
    index("nhat_ky_theo_ban_ghi").on(t.bang, t.banGhiId),
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
  /**
   * Khai thuế theo tháng hay theo quý — đổi hẳn lịch nghĩa vụ.
   *
   * Theo tháng: hạn ngày 20 tháng sau. Theo quý: hạn ngày cuối tháng đầu quý
   * sau. Đoán sai chu kỳ là sinh ra một lịch đúng hình thức nhưng sai mọi mốc,
   * và khách tin nó. Mặc định 'quy' vì phần lớn doanh nghiệp nhỏ thuộc diện
   * khai quý — nhưng đây là thứ PHẢI hỏi khách, không phải suy.
   */
  khaiThueTheo: text("khai_thue_theo").notNull().default("quy"),
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
