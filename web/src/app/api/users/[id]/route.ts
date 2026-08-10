import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { thuHoiTatCaPhien, yeuCauVaiTro } from "@/server/session";
import {
  VAI_TRO_CAP_DUOC,
  capNhatNguoiDung,
  demQuanTri,
  raNgoai,
  timNguoiDungTheoId,
  xoaNguoiDung,
  type VaiTro,
} from "@/server/store/users";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const nguoiThucHien = await yeuCauVaiTro("quan_ly");
  if (!nguoiThucHien) return NextResponse.json({ message: "Không đủ quyền." }, { status: 403 });

  const { id } = await params;
  const muc = await timNguoiDungTheoId(id);
  if (!muc) return NextResponse.json({ message: "Không tìm thấy người dùng." }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const patch: Partial<{ ho: string; ten: string; dienThoai: string | null; vaiTro: VaiTro; matKhauHash: string }> = {};

  if (body.vaiTro !== undefined) {
    if (!VAI_TRO_CAP_DUOC.includes(body.vaiTro)) {
      return NextResponse.json({ message: `Vai trò cấp được: ${VAI_TRO_CAP_DUOC.join(", ")}` }, { status: 400 });
    }
    if (muc.vaiTro === "admin" && (await demQuanTri()) <= 1) {
      return NextResponse.json({ message: "Không thể hạ cấp quản trị viên cuối cùng." }, { status: 400 });
    }
    patch.vaiTro = body.vaiTro;
  }
  if (body.ho !== undefined) patch.ho = String(body.ho).trim();
  if (body.ten !== undefined) patch.ten = String(body.ten).trim();
  if (body.dienThoai !== undefined) patch.dienThoai = body.dienThoai || null;
  if (body.matKhauMoi !== undefined) {
    if (String(body.matKhauMoi).length < 8) {
      return NextResponse.json({ message: "Mật khẩu phải có ít nhất 8 ký tự." }, { status: 400 });
    }
    patch.matKhauHash = bcrypt.hashSync(body.matKhauMoi, 10);
  }

  const capNhat = await capNhatNguoiDung(id, patch, nguoiThucHien.id);

  // Hạ quyền hoặc đổi mật khẩu người khác mà không cắt phiên của họ thì họ vẫn
  // giữ nguyên quyền cũ tới bảy ngày. Đúng chỗ Body không xử lý được.
  if (patch.vaiTro !== undefined || patch.matKhauHash !== undefined) {
    await thuHoiTatCaPhien(id);
  }

  return NextResponse.json({ nguoiDung: raNgoai(capNhat!) });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const nguoiThucHien = await yeuCauVaiTro("quan_ly");
  if (!nguoiThucHien) return NextResponse.json({ message: "Không đủ quyền." }, { status: 403 });

  const { id } = await params;
  if (id === nguoiThucHien.id) {
    return NextResponse.json({ message: "Không thể tự xoá tài khoản đang dùng." }, { status: 400 });
  }
  const muc = await timNguoiDungTheoId(id);
  if (!muc) return NextResponse.json({ message: "Không tìm thấy người dùng." }, { status: 404 });
  if (muc.vaiTro === "admin" && (await demQuanTri()) <= 1) {
    return NextResponse.json({ message: "Không thể xoá quản trị viên cuối cùng." }, { status: 400 });
  }

  await thuHoiTatCaPhien(id);
  await xoaNguoiDung(id, nguoiThucHien.id);
  return new NextResponse(null, { status: 204 });
}
