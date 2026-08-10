import { NextResponse } from "next/server";
import { yeuCauVaiTro } from "@/server/session";
import { danhSachGiaoVien, taoGiaoVien } from "@/server/store/giaoVien";

export async function GET() {
  if (!(await yeuCauVaiTro("ke_toan"))) {
    return NextResponse.json({ message: "Không đủ quyền." }, { status: 403 });
  }
  return NextResponse.json({ giaoVien: await danhSachGiaoVien() });
}

export async function POST(request: Request) {
  if (!(await yeuCauVaiTro("ke_toan"))) {
    return NextResponse.json({ message: "Không đủ quyền." }, { status: 403 });
  }
  const b = await request.json().catch(() => ({}));
  const hoTen = String(b.hoTen ?? "").trim();
  if (!hoTen) return NextResponse.json({ message: "Thiếu họ tên." }, { status: 400 });

  return NextResponse.json(
    {
      giaoVien: await taoGiaoVien({
        hoTen,
        mon: b.mon ? String(b.mon) : undefined,
        dienThoai: b.dienThoai ? String(b.dienThoai) : undefined,
        maSoThue: b.maSoThue ? String(b.maSoThue) : undefined,
        laGvTruongCong: Boolean(b.laGvTruongCong),
      }),
    },
    { status: 201 },
  );
}
