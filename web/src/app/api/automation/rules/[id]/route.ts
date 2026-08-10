import { NextResponse } from "next/server";
import { yeuCauVaiTro } from "@/server/session";
import { capNhatQuyTac, timQuyTac, xoaQuyTac } from "@/server/store/automation";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await yeuCauVaiTro("ke_toan"))) {
    return NextResponse.json({ message: "Không đủ quyền." }, { status: 403 });
  }
  const quyTac = await timQuyTac((await params).id);
  if (!quyTac) return NextResponse.json({ message: "Không tìm thấy quy tắc." }, { status: 404 });
  return NextResponse.json({ quyTac });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await yeuCauVaiTro("quan_ly"))) {
    return NextResponse.json({ message: "Không đủ quyền." }, { status: 403 });
  }
  const { id } = await params;
  if (!(await timQuyTac(id))) {
    return NextResponse.json({ message: "Không tìm thấy quy tắc." }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const patch: Partial<{ ten: string; bat: boolean; n8nWorkflowId: string | null }> = {};
  if (body.ten !== undefined) {
    if (!String(body.ten).trim()) {
      return NextResponse.json({ message: "Tên không được để trống." }, { status: 400 });
    }
    patch.ten = String(body.ten).trim();
  }
  if (body.bat !== undefined) patch.bat = Boolean(body.bat);
  if (body.n8nWorkflowId !== undefined) patch.n8nWorkflowId = body.n8nWorkflowId || null;

  return NextResponse.json({ quyTac: await capNhatQuyTac(id, patch) });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await yeuCauVaiTro("quan_ly"))) {
    return NextResponse.json({ message: "Không đủ quyền." }, { status: 403 });
  }
  await xoaQuyTac((await params).id);
  return new NextResponse(null, { status: 204 });
}
