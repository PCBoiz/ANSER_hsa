import { NextResponse } from "next/server";
import { yeuCauVaiTro } from "@/server/session";
import { buoiCuaThuLao, huyThuLao } from "@/server/store/giaoVien";

/** Trả về đúng thứ giáo viên hỏi: bảng này gồm những buổi nào. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await yeuCauVaiTro("ke_toan"))) {
    return NextResponse.json({ message: "Không đủ quyền." }, { status: 403 });
  }
  return NextResponse.json({ buoiDay: await buoiCuaThuLao((await params).id) });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const nguoiDung = await yeuCauVaiTro("quan_ly");
  if (!nguoiDung) {
    return NextResponse.json({ message: "Không đủ quyền." }, { status: 403 });
  }
  // Huỷ bảng thì trả các buổi về trạng thái chưa chốt, không xoá buổi.
  await huyThuLao((await params).id, nguoiDung.id);
  return new NextResponse(null, { status: 204 });
}
