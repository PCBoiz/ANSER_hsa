import { NextResponse } from "next/server";
import { yeuCauVaiTro } from "@/server/session";
import { ConDongChuaQuyetError, danhSachKy, datTrangThaiKy } from "@/server/store/soThuChi";

export async function GET() {
  if (!(await yeuCauVaiTro("ke_toan"))) {
    return NextResponse.json({ message: "Không đủ quyền." }, { status: 403 });
  }
  return NextResponse.json({ ky: await danhSachKy() });
}

/**
 * Khoá hoặc mở khoá một kỳ. Chỉ quản lý.
 *
 * Khoá sổ là tuyên bố "số của kỳ này đã chốt", và mở khoá là mở lại một kỳ có
 * thể đã nộp tờ khai. Cả hai đều vào nhật ký kèm trạng thái trước và sau.
 */
export async function PATCH(request: Request) {
  const nguoiDung = await yeuCauVaiTro("quan_ly");
  if (!nguoiDung) {
    return NextResponse.json(
      { message: "Khoá sổ là việc của quản lý — đây là tuyên bố số liệu đã chốt." },
      { status: 403 },
    );
  }

  const b = await request.json().catch(() => ({}));
  const ky = String(b.ky ?? "");
  const trangThai = String(b.trangThai ?? "");
  if (!["mo", "dang_chot", "da_khoa"].includes(trangThai)) {
    return NextResponse.json({ message: "Trạng thái phải là: mo, dang_chot, da_khoa." }, { status: 400 });
  }

  try {
    await datTrangThaiKy(
      ky,
      trangThai as "mo" | "dang_chot" | "da_khoa",
      nguoiDung.id,
      b.ghiChu ? String(b.ghiChu) : null,
    );
    return NextResponse.json({ ky: await danhSachKy() });
  } catch (e) {
    if (e instanceof ConDongChuaQuyetError) {
      return NextResponse.json({ message: e.message, soDong: e.soDong }, { status: 409 });
    }
    return NextResponse.json(
      { message: e instanceof Error ? e.message : "Không đổi được trạng thái kỳ." },
      { status: 400 },
    );
  }
}
