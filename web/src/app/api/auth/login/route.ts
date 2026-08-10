import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { COOKIE_NAME, tuyChonCookie } from "@/server/auth";
import { biChan, donRacCu, ghiLanHong, xoaLanHong, CUA_SO_PHUT } from "@/server/rateLimit";
import { donPhienCu, taoPhien } from "@/server/session";
import { timNguoiDungTheoEmail, raNgoai } from "@/server/store/users";

function layIp(request: Request): string | null {
  const xff = request.headers.get("x-forwarded-for");
  return xff ? xff.split(",")[0].trim() : null;
}

export async function POST(request: Request) {
  const { email, matKhau } = await request.json().catch(() => ({}));
  if (!email || !matKhau) {
    return NextResponse.json({ message: "Thiếu email hoặc mật khẩu." }, { status: 400 });
  }

  const ip = layIp(request);

  if (await biChan(email, ip)) {
    return NextResponse.json(
      { message: `Sai quá nhiều lần. Thử lại sau ${CUA_SO_PHUT} phút.` },
      { status: 429, headers: { "Retry-After": String(CUA_SO_PHUT * 60) } },
    );
  }

  const nguoiDung = await timNguoiDungTheoEmail(email);
  // So sánh cả khi không tìm thấy người dùng thì thời gian phản hồi mới không
  // tiết lộ email nào có tồn tại trong hệ thống.
  const hashGia = "$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidin";
  const dung = await bcrypt.compare(matKhau, nguoiDung?.matKhauHash ?? hashGia);

  if (!nguoiDung || !dung) {
    await ghiLanHong(email, ip);
    return NextResponse.json({ message: "Email hoặc mật khẩu không đúng." }, { status: 401 });
  }

  await xoaLanHong(email);
  // Dọn rác kèm lúc đăng nhập — rẻ, và không phải dựng cron cho hai bảng nhỏ.
  await Promise.all([donRacCu(), donPhienCu()]).catch(() => {});
  const token = await taoPhien(nguoiDung.id, ip, request.headers.get("user-agent"));
  (await cookies()).set(COOKIE_NAME, token, tuyChonCookie);

  return NextResponse.json({ nguoiDung: raNgoai(nguoiDung) });
}
