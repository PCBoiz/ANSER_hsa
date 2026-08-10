import { NextResponse } from "next/server";
import { yeuCauVaiTro } from "@/server/session";
import { capNhatCaiDatCongTy, layCaiDatCongTy } from "@/server/store/settings";

export async function GET() {
  if (!(await yeuCauVaiTro("ke_toan"))) {
    return NextResponse.json({ message: "Không đủ quyền." }, { status: 403 });
  }
  return NextResponse.json({ caiDat: await layCaiDatCongTy() });
}

export async function PATCH(request: Request) {
  if (!(await yeuCauVaiTro("quan_ly"))) {
    return NextResponse.json({ message: "Không đủ quyền." }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const patch: Parameters<typeof capNhatCaiDatCongTy>[0] = {};

  if (body.ten !== undefined) {
    if (!String(body.ten).trim()) {
      return NextResponse.json({ message: "Tên công ty không được để trống." }, { status: 400 });
    }
    patch.ten = String(body.ten).trim();
  }
  for (const k of ["diaChi", "dienThoai", "email", "maSoThue"] as const) {
    if (body[k] !== undefined) patch[k] = body[k] || null;
  }
  if (body.khaiThueTheo !== undefined) {
    if (!["thang", "quy"].includes(String(body.khaiThueTheo))) {
      return NextResponse.json({ message: "Khai thuế theo phải là 'thang' hoặc 'quy'." }, { status: 400 });
    }
    patch.khaiThueTheo = String(body.khaiThueTheo);
  }
  if (body.vungLuongToiThieu !== undefined) {
    const v = Number(body.vungLuongToiThieu);
    if (![1, 2, 3, 4].includes(v)) {
      return NextResponse.json({ message: "Vùng lương tối thiểu phải là 1, 2, 3 hoặc 4." }, { status: 400 });
    }
    patch.vungLuongToiThieu = v;
  }

  return NextResponse.json({ caiDat: await capNhatCaiDatCongTy(patch) });
}
