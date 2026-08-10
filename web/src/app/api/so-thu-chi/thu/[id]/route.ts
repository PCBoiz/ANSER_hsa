import { NextResponse } from "next/server";
import { yeuCauVaiTro } from "@/server/session";
import { KyDaKhoaError, xoaKhoanThu } from "@/server/store/soThuChi";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const nguoiDung = await yeuCauVaiTro("ke_toan");
  if (!nguoiDung) return NextResponse.json({ message: "Không đủ quyền." }, { status: 403 });
  try {
    const xong = await xoaKhoanThu((await params).id, nguoiDung.id);
    if (!xong) return NextResponse.json({ message: "Không tìm thấy khoản thu." }, { status: 404 });
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    if (e instanceof KyDaKhoaError) return NextResponse.json({ message: e.message }, { status: 409 });
    throw e;
  }
}
