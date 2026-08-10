import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { COOKIE_NAME, tuyChonCookie } from "@/server/auth";
import { taoPhien } from "@/server/session";
import { demQuanTri, raNgoai, taoNguoiDung, timNguoiDungTheoEmail } from "@/server/store/users";

export async function POST(request: Request) {
  const { ho, ten, email, dienThoai, matKhau } = await request.json().catch(() => ({}));

  if (!ho || !ten || !email || !matKhau) {
    return NextResponse.json({ message: "Thiếu thông tin bắt buộc." }, { status: 400 });
  }
  if (String(matKhau).length < 8) {
    return NextResponse.json({ message: "Mật khẩu phải có ít nhất 8 ký tự." }, { status: 400 });
  }
  if (await timNguoiDungTheoEmail(email)) {
    return NextResponse.json({ message: "Email đã được sử dụng." }, { status: 409 });
  }

  // Người đầu tiên là chủ. Từ người thứ hai trở đi mặc định thấp nhất — tự đăng
  // ký mà thành quản lý thì ai biết link cũng xem được thù lao giáo viên.
  const laNguoiDauTien = (await demQuanTri()) === 0;

  const nguoiDung = await taoNguoiDung({
    ho,
    ten,
    email,
    dienThoai,
    matKhauHash: await bcrypt.hash(matKhau, 10),
    vaiTro: laNguoiDauTien ? "admin" : "tro_giang",
  });

  const xff = request.headers.get("x-forwarded-for");
  const token = await taoPhien(
    nguoiDung.id,
    xff ? xff.split(",")[0].trim() : null,
    request.headers.get("user-agent"),
  );
  (await cookies()).set(COOKIE_NAME, token, tuyChonCookie);

  return NextResponse.json({ nguoiDung: raNgoai(nguoiDung) }, { status: 201 });
}
