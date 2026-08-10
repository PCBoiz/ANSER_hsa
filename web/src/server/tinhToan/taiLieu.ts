/**
 * Hàm thuần cho kho chứng từ. KHÔNG import gì chạm database hay mạng.
 *
 * Bốn thứ ở đây đều là chỗ dễ sai mà sai thì im lặng: chuẩn hoá kỳ, quyền xem
 * theo loại, và dựng đường dẫn lưu trữ từ tên file người dùng đặt.
 */

export const LOAI_TAI_LIEU = [
  "chung_tu",
  "hop_dong",
  "ban_xuat_misa",
  "to_khai",
  "giay_phep",
  "sao_ke",
  "khac",
] as const;
export type LoaiTaiLieu = (typeof LOAI_TAI_LIEU)[number];

export const NHAN_LOAI_TAI_LIEU: Record<LoaiTaiLieu, string> = {
  chung_tu: "Chứng từ",
  hop_dong: "Hợp đồng",
  ban_xuat_misa: "Bản xuất MISA",
  to_khai: "Tờ khai thuế",
  giay_phep: "Giấy phép",
  sao_ke: "Sao kê ngân hàng",
  khac: "Khác",
};

export function laLoaiHopLe(x: unknown): x is LoaiTaiLieu {
  return typeof x === "string" && (LOAI_TAI_LIEU as readonly string[]).includes(x);
}

/**
 * Quyền xem tối thiểu theo loại tài liệu.
 *
 * Hợp đồng lao động nằm chung kho với chứng từ thường, và trong đó có mức lương
 * của từng người. Trợ giảng không được thấy. Đây là lý do kho chứng từ không thể
 * dùng chung một mức quyền cho mọi thứ.
 */
export function vaiTroToiThieuXem(loai: LoaiTaiLieu): "ke_toan" | "quan_ly" {
  return loai === "hop_dong" ? "quan_ly" : "ke_toan";
}

/**
 * Kỳ chấp nhận 'YYYY' hoặc 'YYYY-MM'. Trả `null` khi không nhận ra — `null` ở
 * đây nghĩa là "tài liệu không thuộc kỳ nào" (giấy phép, điều lệ), nên hàm gọi
 * phải phân biệt được "người dùng bỏ trống" với "người dùng gõ sai".
 */
export function chuanHoaKy(input: unknown): { ky: string | null; loi?: string } {
  if (input === undefined || input === null || input === "") return { ky: null };
  const s = String(input).trim();

  let m = /^(\d{4})$/.exec(s);
  if (m) {
    const nam = Number(m[1]);
    if (nam < 2000 || nam > 2100) return { ky: null, loi: `Năm ${nam} nằm ngoài khoảng 2000–2100.` };
    return { ky: m[1] };
  }

  m = /^(\d{4})[-/](\d{1,2})$/.exec(s);
  if (m) {
    const nam = Number(m[1]);
    const thang = Number(m[2]);
    if (nam < 2000 || nam > 2100) return { ky: null, loi: `Năm ${nam} nằm ngoài khoảng 2000–2100.` };
    if (thang < 1 || thang > 12) return { ky: null, loi: `Tháng ${thang} không hợp lệ.` };
    return { ky: `${m[1]}-${String(thang).padStart(2, "0")}` };
  }

  return { ky: null, loi: `Kỳ phải là YYYY hoặc YYYY-MM, nhận được "${s}".` };
}

/**
 * Bỏ dấu, thay khoảng trắng, chỉ giữ ký tự an toàn.
 *
 * Tên file do người dùng đặt và đi thẳng vào đường dẫn trên kho. `../` trong tên
 * là đường ghi đè file khác; ký tự unicode làm một số client S3 ký sai chữ ký và
 * lỗi hiện ra ở tận lúc tải về.
 */
export function lamSachTenFile(ten: string): string {
  const khongDau = ten
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // dấu tổ hợp tiếng Việt
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
  const sach = khongDau
    .replace(/[^\w.\-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "");
  return sach.slice(0, 120) || "tai-lieu";
}

/** Đường dẫn trong kho. Có kỳ thì xếp theo kỳ — để mở kho ra là thấy trật tự. */
export function duongDanKho(p: { loai: LoaiTaiLieu; ky: string | null; id: string; ten: string }): string {
  const nganKy = p.ky ?? "khong-ky";
  return `${nganKy}/${p.loai}/${p.id}-${lamSachTenFile(p.ten)}`;
}

/**
 * Đọc ngược `loai`, `ky`, `id` ra khỏi đường dẫn đã ký.
 *
 * Bước xác nhận sau khi trình duyệt đẩy file KHÔNG được tin `loai` và `ky` mà
 * client gửi kèm. Nếu tin thì kế toán xin một URL cho `chung_tu` — thứ họ có
 * quyền — rồi lúc xác nhận khai thành loại khác, và bản ghi vào sổ với một loại
 * họ không được phép đặt. Đường dẫn thì đã bị khoá cứng trong chữ ký, nên đọc
 * ngược từ đó là nguồn duy nhất tin được.
 *
 * Trả `null` khi đường dẫn không đúng khuôn — coi như yêu cầu bịa.
 */
export function phanTichDuongDan(
  duongDan: string,
): { ky: string | null; loai: LoaiTaiLieu; id: string } | null {
  const m = /^([^/]+)\/([^/]+)\/([0-9a-f-]{36})-(.+)$/i.exec(duongDan);
  if (!m) return null;
  const [, nganKy, loai, id] = m;
  if (!laLoaiHopLe(loai)) return null;
  if (nganKy !== "khong-ky") {
    const { ky, loi } = chuanHoaKy(nganKy);
    if (loi || ky !== nganKy) return null;
    return { ky, loai, id };
  }
  return { ky: null, loai, id };
}

const DON_VI = ["B", "KB", "MB", "GB"];

export function hienKichThuoc(byte: number | null | undefined): string {
  if (byte === null || byte === undefined) return "—"; // chưa biết, khác 0
  if (byte === 0) return "0 B";
  const i = Math.min(Math.floor(Math.log(byte) / Math.log(1024)), DON_VI.length - 1);
  const n = byte / Math.pow(1024, i);
  return `${n >= 10 || i === 0 ? Math.round(n) : n.toFixed(1)} ${DON_VI[i]}`;
}

/** Trần 25MB mỗi file. Bản xuất MISA và sao kê thực tế nhỏ hơn nhiều. */
export const KICH_THUOC_TOI_DA = 25 * 1024 * 1024;
