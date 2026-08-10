import { NextResponse } from "next/server";
import { yeuCauVaiTro } from "@/server/session";
import { KyDaKhoaError, danhDauKeKhai } from "@/server/store/soThuChi";

const DIEN = ["da_ke_khai", "chua_ke_khai", "chua_quyet"] as const;
type Dien = (typeof DIEN)[number];

/**
 * Đánh dấu kê khai hàng loạt.
 *
 * Chỉ kế toán trở lên — đây là thao tác quyết định dòng nào vào bản kết xuất
 * thuế, không phải việc của trợ giảng. Mỗi dòng đổi đều vào nhật ký kèm trạng
 * thái trước và sau.
 */
export async function PATCH(request: Request) {
  const nguoiDung = await yeuCauVaiTro("ke_toan");
  if (!nguoiDung) return NextResponse.json({ message: "Không đủ quyền." }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const ids: string[] = Array.isArray(body.ids) ? body.ids.map(String) : [];
  const dien = String(body.dien ?? "") as Dien;

  if (ids.length === 0) return NextResponse.json({ message: "Chưa chọn dòng nào." }, { status: 400 });
  if (!DIEN.includes(dien)) {
    return NextResponse.json({ message: `Diện kê khai phải là: ${DIEN.join(", ")}` }, { status: 400 });
  }

  try {
    const soDong = await danhDauKeKhai(ids, dien, nguoiDung.id);
    return NextResponse.json({ soDong });
  } catch (e) {
    if (e instanceof KyDaKhoaError) {
      return NextResponse.json({ message: e.message, cacKy: e.cacKy }, { status: 409 });
    }
    throw e;
  }
}
