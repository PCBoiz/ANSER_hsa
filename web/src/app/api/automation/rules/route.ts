import { NextResponse } from "next/server";
import { yeuCauVaiTro } from "@/server/session";
import { LOAI_QUY_TAC, danhSachQuyTac, taoQuyTac, type LoaiQuyTac } from "@/server/store/automation";

export async function GET() {
  if (!(await yeuCauVaiTro("ke_toan"))) {
    return NextResponse.json({ message: "Không đủ quyền." }, { status: 403 });
  }
  return NextResponse.json({ quyTac: await danhSachQuyTac() });
}

export async function POST(request: Request) {
  if (!(await yeuCauVaiTro("quan_ly"))) {
    return NextResponse.json({ message: "Không đủ quyền." }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const ten = String(body.ten ?? "").trim();
  const loai = body.loai as LoaiQuyTac;

  if (!ten) return NextResponse.json({ message: "Thiếu tên quy tắc." }, { status: 400 });
  if (!LOAI_QUY_TAC.includes(loai)) {
    return NextResponse.json(
      { message: `Loại không hợp lệ. Chọn một trong: ${LOAI_QUY_TAC.join(", ")}` },
      { status: 400 },
    );
  }

  const quyTac = await taoQuyTac({ ten, loai, bat: body.bat, n8nWorkflowId: body.n8nWorkflowId });
  return NextResponse.json({ quyTac }, { status: 201 });
}
