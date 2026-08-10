import { db, type Db } from "@/server/db/client";
import { nhatKyThayDoi } from "@/server/db/schema";

/**
 * Nhật ký thay đổi — append-only, cưỡng chế bằng trigger ở tầng DB.
 *
 * Trước audit 10/08/2026, hàm này nằm riêng trong `soThuChi.ts` và **chỉ sổ thu
 * chi ghi nhật ký**. Bảy đường ghi còn lại — hồ sơ TT29, thù lao, tài liệu, vai
 * trò người dùng, cài đặt — đều im lặng. Nghĩa là lời hứa "mọi con số truy được"
 * chỉ đúng một phần bảy, mà mấy đường im lặng kia lại là những đường nặng nhất:
 * ai tuyên bố đã công khai hồ sơ TT29, ai chốt số tiền trả ra, ai đổi vai trò
 * của ai.
 *
 * Không có `capNhatNhatKy` và sẽ không bao giờ có.
 */
export async function ghiNhatKy(
  bang: string,
  banGhiId: string,
  hanhDong: "them" | "sua" | "xoa",
  nguoiDungId: string | null,
  truoc?: unknown,
  sau?: unknown,
  /**
   * Truyền `tx` để ghi nhật ký NẰM TRONG cùng giao dịch với thay đổi.
   *
   * Không truyền thì hai việc tách rời: nếu nhật ký hỏng sau khi đã sửa dữ liệu
   * thì còn lại một thay đổi không ai biết đã xảy ra. Với một nhật ký kiểm toán
   * thì đó đúng là tình huống nó sinh ra để chặn.
   */
  tx: Db = db,
): Promise<void> {
  await tx.insert(nhatKyThayDoi).values({
    bang,
    banGhiId,
    hanhDong,
    truoc: truoc === undefined ? null : (truoc as object),
    sau: sau === undefined ? null : (sau as object),
    nguoiDungId,
  });
}

/**
 * Bỏ hash mật khẩu trước khi đưa vào nhật ký.
 *
 * Nhật ký là append-only nên cái gì lọt vào là ở lại vĩnh viễn — kể cả khi tài
 * khoản đã xoá. Ghi nguyên bản ghi `nguoi_dung` là chép hash mật khẩu vào một
 * bảng không xoá được.
 */
export function locNhayCam<T extends Record<string, unknown>>(x: T | undefined | null) {
  if (!x) return x;
  const { matKhauHash: _bo, ...con } = x as Record<string, unknown>;
  return con;
}
