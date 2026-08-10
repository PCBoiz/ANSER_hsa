/**
 * Đối chiếu kho file với sổ tài liệu — phần đụng vào mạng và DB.
 *
 * Phép phân loại nằm ở `@/server/tinhToan/doiChieuKho`; ở đây chỉ đi lấy hai
 * danh sách rồi giao cho nó, và thực hiện việc xoá.
 */

import { db } from "@/server/db/client";
import { taiLieu } from "@/server/db/schema";
import { lietKeKho, xoaKhoiKho } from "@/server/luuTru/kho";
import {
  GIO_CHO_MAC_DINH,
  phanLoaiDoiChieu,
  type KetQuaDoiChieu,
} from "@/server/tinhToan/doiChieuKho";

export async function doiChieuKho(gioCho = GIO_CHO_MAC_DINH): Promise<KetQuaDoiChieu> {
  const [trongKho, trongSo] = await Promise.all([
    lietKeKho(),
    db.select({ id: taiLieu.id, ten: taiLieu.ten, duongDan: taiLieu.duongDan }).from(taiLieu),
  ]);
  return phanLoaiDoiChieu(trongKho, trongSo, new Date(), gioCho);
}

/**
 * Dọn thật.
 *
 * Đối chiếu LẠI ngay trước khi xoá thay vì nhận danh sách từ bên gọi: danh sách
 * người dùng đang nhìn trên màn hình có thể đã cũ vài phút, và trong vài phút đó
 * một lần tải lên khác vừa xác nhận xong. Xoá theo danh sách cũ là xoá đúng file
 * vừa mới hợp lệ.
 */
export async function donMoCoi(
  gioCho = GIO_CHO_MAC_DINH,
): Promise<{ daXoa: string[]; hong: { duongDan: string; ly: string }[] }> {
  const { moCoi } = await doiChieuKho(gioCho);
  const daXoa: string[] = [];
  const hong: { duongDan: string; ly: string }[] = [];
  for (const m of moCoi) {
    try {
      await xoaKhoiKho(m.duongDan);
      daXoa.push(m.duongDan);
    } catch (e) {
      hong.push({ duongDan: m.duongDan, ly: e instanceof Error ? e.message : String(e) });
    }
  }
  return { daXoa, hong };
}
