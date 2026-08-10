/**
 * Đối chiếu kho file với sổ tài liệu — phần thuần tính toán.
 *
 * Tải thẳng lên R2 đổi được trần 4,5MB của Vercel, nhưng nó tách đôi một việc
 * vốn liền mạch: file lên kho ở bước hai, sổ ghi ở bước ba. Đứt giữa hai bước —
 * đóng tab, mất mạng, bước xác nhận trả 400 — thì file nằm lại trên kho mà không
 * ai biết nó ở đó. Nó vẫn tính tiền lưu trữ, và tệ hơn: nó là chứng từ có tên
 * học viên nằm ngoài mọi danh sách kiểm.
 *
 * Lệch được cả hai chiều, và hai chiều nguy hiểm khác nhau:
 *
 *   - CÓ FILE, KHÔNG CÓ SỔ  → rác. Xoá được, nhưng phải chờ.
 *   - CÓ SỔ, KHÔNG CÓ FILE  → nặng hơn nhiều. Giao diện vẫn hiện dòng đó, người
 *                              dùng bấm tải về và nhận lỗi. Tuyệt đối KHÔNG tự
 *                              xoá dòng sổ: dòng đó là bằng chứng từng có tài
 *                              liệu, và biết mình mất gì thì hơn là mất luôn cả
 *                              việc biết.
 *
 * Nên hàm này báo cáo cả hai, nhưng chỉ chiều thứ nhất được đưa vào danh sách
 * dọn.
 */

export type DongKho = { duongDan: string; kichThuoc: number; sua: Date };
export type DongSo = { id: string; ten: string; duongDan: string };

/** Object mới hơn ngần này giờ thì để yên — có thể ai đó đang đẩy dở. */
export const GIO_CHO_MAC_DINH = 2;

export type KetQuaDoiChieu = {
  /** Có file, không có sổ, và đã quá hạn chờ → dọn được. */
  moCoi: DongKho[];
  /** Có file, không có sổ, nhưng còn mới → CHƯA đụng vào. */
  conCho: DongKho[];
  /** Có sổ, không có file → phải người xem, không tự xử lý. */
  thieuFile: DongSo[];
  khop: number;
};

/**
 * Điều kiện xoá là GIAO của hai vế: không có trong sổ VÀ đã quá hạn chờ.
 * Viết tách thành hai bước như dưới để không ai vô tình sửa thành hoặc.
 */
export function phanLoaiDoiChieu(
  trongKho: DongKho[],
  trongSo: DongSo[],
  bayGio: Date,
  gioCho: number,
): KetQuaDoiChieu {
  const duongDanTrongSo = new Set(trongSo.map((t) => t.duongDan));
  const duongDanTrongKho = new Set(trongKho.map((k) => k.duongDan));
  const hanCho = bayGio.getTime() - gioCho * 3600_000;

  const moCoi: DongKho[] = [];
  const conCho: DongKho[] = [];
  for (const k of trongKho) {
    if (duongDanTrongSo.has(k.duongDan)) continue;
    (k.sua.getTime() < hanCho ? moCoi : conCho).push(k);
  }

  return {
    moCoi,
    conCho,
    thieuFile: trongSo.filter((t) => !duongDanTrongKho.has(t.duongDan)),
    khop: trongKho.length - moCoi.length - conCho.length,
  };
}

/** Chặn dưới ở 1 giờ: URL ký sẵn sống 10 phút, cộng một lần đẩy file chậm. */
export function chuanHoaGioCho(raw: string | null): number {
  const n = raw === null ? GIO_CHO_MAC_DINH : Number(raw);
  return Number.isFinite(n) && n >= 1 ? n : GIO_CHO_MAC_DINH;
}
