import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { yeuCauVaiTro } from "@/server/session";
import {
  VAI_TRO_CAP_DUOC,
  danhSachNguoiDung,
  raNgoai,
  taoNguoiDung,
  timNguoiDungTheoEmail,
  type VaiTro,
} from "@/server/store/users";

export async function GET() {
  if (!(await yeuCauVaiTro("quan_ly"))) {
    return NextResponse.json({ message: "Không đủ quyền." }, { status: 403 });
  }
  const ds = await danhSachNguoiDung();
  return NextResponse.json({ nguoiDung: ds.map(raNgoai) });
}

export async function POST(request: Request) {
  if (!(await yeuCauVaiTro("quan_ly"))) {
    return NextResponse.json({ message: "Không đủ quyền." }, { status: 403 });
  }

  const { ho, ten, email, dienThoai, matKhau, vaiTro } = await request.json().catch(() => ({}));
  if (!ho || !ten || !email || !matKhau) {
    return NextResponse.json({ message: "Thiếu thông tin bắt buộc." }, { status: 400 });
  }
  if (String(matKhau).length < 8) {
    return NextResponse.json({ message: "Mật khẩu phải có ít nhất 8 ký tự." }, { status: 400 });
  }
  // `admin` không cấp được từ giao diện — nếu cấp được thì quản lý tự nâng mình
  // lên quản trị, và ranh giới "kế toán xem được thù lao, trợ giảng thì không"
  // mất ý nghĩa.
  if (vaiTro !== undefined && !VAI_TRO_CAP_DUOC.includes(vaiTro)) {
    return NextResponse.json(
      { message: `Vai trò cấp được: ${VAI_TRO_CAP_DUOC.join(", ")}` },
      { status: 400 },
    );
  }
  if (await timNguoiDungTheoEmail(email)) {
    return NextResponse.json({ message: "Email đã được sử dụng." }, { status: 409 });
  }

  const tao = await taoNguoiDung({
    ho,
    ten,
    email,
    dienThoai,
    matKhauHash: await bcrypt.hash(matKhau, 10),
    vaiTro: (vaiTro as VaiTro) ?? "tro_giang",
  });
  return NextResponse.json({ nguoiDung: raNgoai(tao) }, { status: 201 });
}
