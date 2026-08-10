import { NextResponse } from "next/server";
import { xoaKhoiKho } from "@/server/luuTru/kho";
import { yeuCauVaiTro } from "@/server/session";
import { loaiDuocXem, timTaiLieu, xoaTaiLieu } from "@/server/store/taiLieu";
import type { LoaiTaiLieu } from "@/server/tinhToan/taiLieu";
import type { VaiTro } from "@/server/store/users";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const nguoiDung = await yeuCauVaiTro("ke_toan");
  if (!nguoiDung) return NextResponse.json({ message: "Không đủ quyền." }, { status: 403 });

  const ban = await timTaiLieu((await params).id);
  if (!ban) return NextResponse.json({ message: "Không tìm thấy tài liệu." }, { status: 404 });
  // 404 chứ không 403: nói "cấm xem" là đã xác nhận tài liệu đó tồn tại.
  if (!loaiDuocXem(nguoiDung.vaiTro as VaiTro).includes(ban.loai as LoaiTaiLieu)) {
    return NextResponse.json({ message: "Không tìm thấy tài liệu." }, { status: 404 });
  }
  return NextResponse.json({ taiLieu: ban });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const nguoiDung = await yeuCauVaiTro("quan_ly");
  if (!nguoiDung) return NextResponse.json({ message: "Không đủ quyền." }, { status: 403 });

  const ban = await timTaiLieu((await params).id);
  if (!ban) return NextResponse.json({ message: "Không tìm thấy tài liệu." }, { status: 404 });

  // Xoá file trước, xoá sổ sau. Ngược lại thì file mồ côi nằm trên kho mãi mãi
  // và không còn bản ghi nào biết nó ở đâu để dọn.
  try {
    await xoaKhoiKho(ban.duongDan);
  } catch (error) {
    console.error("[kho] không xoá được file, giữ nguyên bản ghi", { id: ban.id, error });
    return NextResponse.json({ message: "Không xoá được file trên kho." }, { status: 502 });
  }
  await xoaTaiLieu(ban.id);
  return new NextResponse(null, { status: 204 });
}
