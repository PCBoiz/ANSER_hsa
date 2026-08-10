import { NextResponse } from "next/server";
import { yeuCauVaiTro } from "@/server/session";
import {
  danhDauCongKhaiTatCaGiaoVien,
  datTrangThai,
  ghiNhanBaoCaoHieuTruong,
  soi,
} from "@/server/store/tt29";
import { MUC_TT29, type MucTt29, type TrangThaiMuc } from "@/server/tinhToan/tt29";

const TRANG_THAI: TrangThaiMuc[] = ["thieu", "dang_lam", "da_cong_khai"];

export async function GET() {
  if (!(await yeuCauVaiTro("ke_toan"))) {
    return NextResponse.json({ message: "Không đủ quyền." }, { status: 403 });
  }
  return NextResponse.json(await soi());
}

export async function PATCH(request: Request) {
  if (!(await yeuCauVaiTro("quan_ly"))) {
    return NextResponse.json(
      { message: "Đánh dấu hồ sơ TT29 là việc của quản lý — đây là tuyên bố pháp lý." },
      { status: 403 },
    );
  }

  const b = await request.json().catch(() => ({}));

  // Hai thao tác gộp một đường vì cùng là "sửa hồ sơ TT29".
  if (b.hanhDong === "cong_khai_tat_ca_giao_vien") {
    return NextResponse.json({ soGiaoVien: await danhDauCongKhaiTatCaGiaoVien() });
  }
  if (b.hanhDong === "ghi_nhan_bao_cao" && b.giaoVienId) {
    const gv = await ghiNhanBaoCaoHieuTruong(String(b.giaoVienId));
    if (!gv) return NextResponse.json({ message: "Không tìm thấy giáo viên." }, { status: 404 });
    return NextResponse.json({ giaoVien: gv });
  }

  const muc = String(b.muc ?? "") as MucTt29;
  const trangThai = String(b.trangThai ?? "") as TrangThaiMuc;
  if (!(MUC_TT29 as readonly string[]).includes(muc)) {
    return NextResponse.json({ message: `Mục không hợp lệ: "${muc}".` }, { status: 400 });
  }
  if (!TRANG_THAI.includes(trangThai)) {
    return NextResponse.json({ message: `Trạng thái phải là: ${TRANG_THAI.join(", ")}` }, { status: 400 });
  }

  return NextResponse.json({
    hoSo: await datTrangThai(muc, trangThai, b.congKhaiTai ? String(b.congKhaiTai) : null),
  });
}
