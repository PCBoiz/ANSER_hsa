import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { layNguoiDungTuPhien, thuHoiTatCaPhien } from "@/server/session";
import { capNhatNguoiDung, raNgoai } from "@/server/store/users";

export async function GET() {
  const nguoiDung = await layNguoiDungTuPhien();
  if (!nguoiDung) return NextResponse.json({ message: "Chưa đăng nhập." }, { status: 401 });
  return NextResponse.json({ nguoiDung: raNgoai(nguoiDung) });
}

export async function PATCH(request: Request) {
  const nguoiDung = await layNguoiDungTuPhien();
  if (!nguoiDung) return NextResponse.json({ message: "Chưa đăng nhập." }, { status: 401 });

  const body = await request.json().catch(() => ({}));

  if (body.matKhauHienTai || body.matKhauMoi) {
    if (!body.matKhauHienTai || !body.matKhauMoi) {
      return NextResponse.json({ message: "Thiếu mật khẩu hiện tại hoặc mật khẩu mới." }, { status: 400 });
    }
    if (String(body.matKhauMoi).length < 8) {
      return NextResponse.json({ message: "Mật khẩu mới phải có ít nhất 8 ký tự." }, { status: 400 });
    }
    if (!(await bcrypt.compare(body.matKhauHienTai, nguoiDung.matKhauHash))) {
      return NextResponse.json({ message: "Mật khẩu hiện tại không đúng." }, { status: 400 });
    }
    await capNhatNguoiDung(nguoiDung.id, { matKhauHash: bcrypt.hashSync(body.matKhauMoi, 10) });
    // Đổi mật khẩu là đá mọi phiên khác ra — nếu ai đó đang dùng trộm tài khoản
    // này thì đổi mật khẩu phải cắt được họ, không thì việc đổi vô nghĩa.
    await thuHoiTatCaPhien(nguoiDung.id);
    return NextResponse.json({ nguoiDung: raNgoai(nguoiDung), phaiDangNhapLai: true });
  }

  const patch: Partial<{ ho: string; ten: string; dienThoai: string | null }> = {};
  if (body.ho !== undefined) {
    if (!String(body.ho).trim()) {
      return NextResponse.json({ message: "Họ không được để trống." }, { status: 400 });
    }
    patch.ho = body.ho;
  }
  if (body.ten !== undefined) {
    if (!String(body.ten).trim()) {
      return NextResponse.json({ message: "Tên không được để trống." }, { status: 400 });
    }
    patch.ten = body.ten;
  }
  if (body.dienThoai !== undefined) patch.dienThoai = body.dienThoai || null;

  const capNhat =
    Object.keys(patch).length > 0 ? await capNhatNguoiDung(nguoiDung.id, patch) : nguoiDung;

  return NextResponse.json({ nguoiDung: raNgoai(capNhat!) });
}
