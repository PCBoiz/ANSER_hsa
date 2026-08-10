import { NextResponse } from "next/server";
import { yeuCauVaiTro } from "@/server/session";
import { KyDaKhoaError } from "@/server/store/soThuChi";
import { chotThuLao, danhSachThuLao, xemTruocThuLao } from "@/server/store/giaoVien";
import { laKyHopLe } from "@/server/tinhToan/soThuChi";

/** `?giaoVienId=&ky=` → xem trước, chưa ghi gì. Không có tham số → danh sách đã chốt. */
export async function GET(request: Request) {
  if (!(await yeuCauVaiTro("ke_toan"))) {
    return NextResponse.json({ message: "Không đủ quyền." }, { status: 403 });
  }
  const q = new URL(request.url).searchParams;
  const gv = q.get("giaoVienId");
  const ky = q.get("ky") ?? "";

  if (gv) {
    if (!laKyHopLe(ky)) return NextResponse.json({ message: "Kỳ phải là YYYY-MM." }, { status: 400 });
    const xem = await xemTruocThuLao(gv, ky);
    if ("loi" in xem) return NextResponse.json({ message: xem.loi }, { status: 400 });
    return NextResponse.json({ xemTruoc: xem });
  }

  return NextResponse.json({ thuLao: await danhSachThuLao(ky && laKyHopLe(ky) ? ky : undefined) });
}

export async function POST(request: Request) {
  if (!(await yeuCauVaiTro("quan_ly"))) {
    return NextResponse.json(
      { message: "Chốt bảng thù lao là việc của quản lý — đây là số tiền sẽ trả ra." },
      { status: 403 },
    );
  }
  const b = await request.json().catch(() => ({}));
  const gv = String(b.giaoVienId ?? "");
  const ky = String(b.ky ?? "");
  if (!gv || !laKyHopLe(ky)) {
    return NextResponse.json({ message: "Thiếu giáo viên hoặc kỳ không hợp lệ." }, { status: 400 });
  }

  try {
    return NextResponse.json({ thuLao: await chotThuLao(gv, ky) }, { status: 201 });
  } catch (e) {
    if (e instanceof KyDaKhoaError) return NextResponse.json({ message: e.message }, { status: 409 });
    return NextResponse.json(
      { message: e instanceof Error ? e.message : "Không chốt được." },
      { status: 400 },
    );
  }
}
