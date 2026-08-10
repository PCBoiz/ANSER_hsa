import { NextResponse } from "next/server";
import { bienConThieu, dayLen, khoCauHinhChua } from "@/server/luuTru/kho";
import { yeuCauVaiTro } from "@/server/session";
import { bamNoiDung, danhSachTaiLieu, ghiTaiLieu, timTheoBam } from "@/server/store/taiLieu";
import {
  KICH_THUOC_TOI_DA,
  chuanHoaKy,
  laLoaiHopLe,
  vaiTroToiThieuXem,
  type LoaiTaiLieu,
} from "@/server/tinhToan/taiLieu";
import type { VaiTro } from "@/server/store/users";

export async function GET(request: Request) {
  const nguoiDung = await yeuCauVaiTro("ke_toan");
  if (!nguoiDung) return NextResponse.json({ message: "Không đủ quyền." }, { status: 403 });

  const q = new URL(request.url).searchParams;

  let loai: LoaiTaiLieu | undefined;
  const loaiRaw = q.get("loai");
  if (loaiRaw !== null && loaiRaw !== "") {
    if (!laLoaiHopLe(loaiRaw)) {
      return NextResponse.json({ message: "Loại tài liệu không hợp lệ." }, { status: 400 });
    }
    loai = loaiRaw;
  }

  const { ky, loi } = chuanHoaKy(q.get("ky"));
  if (loi) return NextResponse.json({ message: loi }, { status: 400 });

  const ds = await danhSachTaiLieu(nguoiDung.vaiTro as VaiTro, { loai, ky: ky ?? undefined });
  return NextResponse.json({ taiLieu: ds });
}

/*
 * KHÔNG còn `POST` ở đây.
 *
 * Đẩy file qua server đụng trần body 4,5MB của Vercel Function — giới hạn ở
 * tầng hạ tầng, `vercel.json` không đổi được. Nay tải lên đi hai bước:
 *
 *   POST /api/tai-lieu/xin-duong   → xin URL ký sẵn, trình duyệt đẩy thẳng lên R2
 *   POST /api/tai-lieu/xac-nhan    → server HEAD lên R2 lấy kích thước và mã băm
 *                                     THẬT rồi mới ghi sổ
 *
 * Bước hai không phải thủ tục: nó là chỗ trần dung lượng và chống trùng được ép
 * bằng con số server tự đọc, thay vì con số client khai.
 */
