import { NextResponse } from "next/server";
import { yeuCauVaiTro } from "@/server/session";
import { coDuLieuMau, gieoBoMau, xoaBoMau } from "@/server/duLieuMau/gieo";

export async function GET() {
  if (!(await yeuCauVaiTro("ke_toan"))) {
    return NextResponse.json({ message: "Không đủ quyền." }, { status: 403 });
  }
  return NextResponse.json({ coDuLieuMau: await coDuLieuMau() });
}

export async function POST() {
  if (!(await yeuCauVaiTro("quan_ly"))) {
    return NextResponse.json({ message: "Không đủ quyền." }, { status: 403 });
  }
  return NextResponse.json({ daGieo: await gieoBoMau() }, { status: 201 });
}

/**
 * Xoá sạch dữ liệu mẫu, giữ nguyên dữ liệu thật.
 *
 * Đây là lời hứa của cột `nguon` trên 23 bảng, và là điều kiện để đưa bản có
 * dữ liệu mẫu cho khách bấm thử mà không sợ lẫn.
 */
export async function DELETE() {
  if (!(await yeuCauVaiTro("quan_ly"))) {
    return NextResponse.json({ message: "Không đủ quyền." }, { status: 403 });
  }
  return NextResponse.json({ daXoa: await xoaBoMau() });
}
