import { NextResponse } from "next/server";
import { yeuCauVaiTro } from "@/server/session";
import { KyDaKhoaError } from "@/server/store/soThuChi";
import { buoiDayTrongKy, ghiBuoiDay, type BuoiMoi } from "@/server/store/giaoVien";
import { docNgay, docSoTien, laKyHopLe } from "@/server/tinhToan/soThuChi";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await yeuCauVaiTro("ke_toan"))) {
    return NextResponse.json({ message: "Không đủ quyền." }, { status: 403 });
  }
  const ky = new URL(request.url).searchParams.get("ky") ?? "";
  if (!laKyHopLe(ky)) return NextResponse.json({ message: "Kỳ phải là YYYY-MM." }, { status: 400 });
  return NextResponse.json({ buoiDay: await buoiDayTrongKy((await params).id, ky) });
}

/** Nhận một buổi hoặc cả khối dán. Cùng đường, cùng kiểm tra. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await yeuCauVaiTro("ke_toan"))) {
    return NextResponse.json({ message: "Không đủ quyền." }, { status: 403 });
  }
  const body = await request.json().catch(() => null);
  const tho: unknown[] = Array.isArray(body?.dong) ? body.dong : body ? [body] : [];
  if (tho.length === 0) return NextResponse.json({ message: "Không có buổi nào." }, { status: 400 });

  const cac: BuoiMoi[] = [];
  const loi: { dong: number; ly: string }[] = [];

  tho.forEach((x, i) => {
    const d = x as Record<string, unknown>;
    const stt = i + 1;

    const ngay = docNgay(String(d.ngay ?? ""));
    if (!ngay) return void loi.push({ dong: stt, ly: `Ngày không đọc được: "${d.ngay}".` });

    const donGia = typeof d.donGia === "number" ? Math.round(d.donGia) : docSoTien(String(d.donGia ?? ""));
    if (donGia === null || donGia <= 0) {
      return void loi.push({ dong: stt, ly: `Đơn giá không đọc được: "${d.donGia}".` });
    }

    const tinhTheo = d.tinhTheo === "gio" ? "gio" : "buoi";
    let soGio: number | null = null;
    if (tinhTheo === "gio") {
      soGio = Number(d.soGio);
      // Tính theo giờ mà thiếu số giờ thì DỪNG — đoán thành 1 giờ là bịa ra
      // một con số tiền, và nó sẽ đi thẳng vào bảng thù lao của người thật.
      if (!Number.isFinite(soGio) || soGio <= 0) {
        return void loi.push({ dong: stt, ly: "Tính theo giờ thì phải ghi số giờ." });
      }
    }
    cac.push({ ngay, donGia, tinhTheo, soGio });
  });

  if (loi.length > 0) {
    return NextResponse.json(
      { message: `${loi.length} dòng có lỗi — chưa ghi buổi nào.`, loi },
      { status: 400 },
    );
  }

  try {
    return NextResponse.json({ buoiDay: await ghiBuoiDay((await params).id, cac) }, { status: 201 });
  } catch (e) {
    if (e instanceof KyDaKhoaError) return NextResponse.json({ message: e.message }, { status: 409 });
    throw e;
  }
}
