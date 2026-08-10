import { NextResponse } from "next/server";
import { duongTaiVe, khoCauHinhChua } from "@/server/luuTru/kho";
import { yeuCauVaiTro } from "@/server/session";
import { loaiDuocXem, timTaiLieu } from "@/server/store/taiLieu";
import type { LoaiTaiLieu } from "@/server/tinhToan/taiLieu";
import type { VaiTro } from "@/server/store/users";

/**
 * Chuyển hướng sang một đường ký sẵn sống 5 phút.
 *
 * Không cho bucket công khai và không proxy nội dung qua app: chứng từ có tên
 * học viên và mức lương, mà một URL công khai rò ra là rò vĩnh viễn.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const nguoiDung = await yeuCauVaiTro("ke_toan");
  if (!nguoiDung) return NextResponse.json({ message: "Không đủ quyền." }, { status: 403 });
  if (!khoCauHinhChua()) {
    return NextResponse.json({ message: "Kho file chưa được cấu hình." }, { status: 503 });
  }

  const ban = await timTaiLieu((await params).id);
  if (!ban) return NextResponse.json({ message: "Không tìm thấy tài liệu." }, { status: 404 });
  if (!loaiDuocXem(nguoiDung.vaiTro as VaiTro).includes(ban.loai as LoaiTaiLieu)) {
    return NextResponse.json({ message: "Không tìm thấy tài liệu." }, { status: 404 });
  }

  try {
    return NextResponse.redirect(await duongTaiVe(ban.duongDan, ban.ten), 302);
  } catch (error) {
    console.error("[kho] không ký được đường tải về", { id: ban.id, error });
    return NextResponse.json({ message: "Không tạo được đường tải về." }, { status: 502 });
  }
}
