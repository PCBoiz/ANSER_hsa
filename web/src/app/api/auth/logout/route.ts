import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { COOKIE_NAME } from "@/server/auth";
import { layJtiHienTai, thuHoiPhien } from "@/server/session";

export async function POST() {
  // Xoá cookie thôi thì chưa đủ: token vẫn còn hợp lệ về chữ ký cho tới khi hết
  // hạn, nên ai giữ được bản sao vẫn dùng được. Phải đóng phiên trong sổ.
  const jti = await layJtiHienTai();
  if (jti) await thuHoiPhien(jti);

  (await cookies()).delete(COOKIE_NAME);
  return new NextResponse(null, { status: 204 });
}
