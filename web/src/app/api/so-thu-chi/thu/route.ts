import { NextResponse } from "next/server";
import { yeuCauVaiTro } from "@/server/session";
import {
  KyDaKhoaError,
  danhSachKhoanThu,
  ghiKhoanThu,
  type DongThuMoi,
} from "@/server/store/soThuChi";
import { docSoTien, docNgay, laKyHopLe } from "@/server/tinhToan/soThuChi";

const DIEN_THUE = ["khong_chiu", "gtgt_5", "gtgt_10", "chua_quyet"];

export async function GET(request: Request) {
  if (!(await yeuCauVaiTro("ke_toan"))) {
    return NextResponse.json({ message: "Không đủ quyền." }, { status: 403 });
  }
  const ky = new URL(request.url).searchParams.get("ky") ?? undefined;
  if (ky && !laKyHopLe(ky)) {
    return NextResponse.json({ message: "Kỳ phải là YYYY-MM." }, { status: 400 });
  }
  return NextResponse.json({ khoanThu: await danhSachKhoanThu(ky) });
}

/** Nhận cả một dòng lẫn một khối nhiều dòng — cùng một đường, cùng một kiểm tra. */
export async function POST(request: Request) {
  const nguoiDung = await yeuCauVaiTro("ke_toan");
  if (!nguoiDung) return NextResponse.json({ message: "Không đủ quyền." }, { status: 403 });

  const body = await request.json().catch(() => null);
  const tho: unknown[] = Array.isArray(body?.dong) ? body.dong : body ? [body] : [];
  if (tho.length === 0) return NextResponse.json({ message: "Không có dòng nào." }, { status: 400 });

  const dong: DongThuMoi[] = [];
  const loi: { dong: number; ly: string }[] = [];

  tho.forEach((x, i) => {
    const d = x as Record<string, unknown>;
    const stt = i + 1;

    const ngay = docNgay(String(d.ngay ?? ""));
    if (!ngay) return void loi.push({ dong: stt, ly: `Ngày không đọc được: "${d.ngay}".` });

    // Số tiền có thể tới dạng số (từ form) hoặc chuỗi (từ khối dán).
    const soTien = typeof d.soTien === "number" ? Math.round(d.soTien) : docSoTien(String(d.soTien ?? ""));
    if (soTien === null) return void loi.push({ dong: stt, ly: `Số tiền không đọc được: "${d.soTien}".` });
    if (soTien <= 0) return void loi.push({ dong: stt, ly: "Số tiền phải lớn hơn 0." });

    const dienThue = String(d.dienThue ?? "chua_quyet");
    if (!DIEN_THUE.includes(dienThue)) {
      return void loi.push({ dong: stt, ly: `Diện thuế không hợp lệ: "${dienThue}".` });
    }

    dong.push({ ngay, soTien, moTa: d.moTa ? String(d.moTa) : undefined, dienThue });
  });

  // Có dòng hỏng thì KHÔNG ghi dòng nào. Ghi một nửa rồi báo lỗi là để lại một
  // cái sổ mà chính người nhập cũng không biết đã vào tới đâu.
  if (loi.length > 0) {
    return NextResponse.json(
      { message: `${loi.length} dòng có lỗi — chưa ghi dòng nào.`, loi },
      { status: 400 },
    );
  }

  try {
    return NextResponse.json({ khoanThu: await ghiKhoanThu(dong, nguoiDung.id) }, { status: 201 });
  } catch (e) {
    if (e instanceof KyDaKhoaError) {
      return NextResponse.json({ message: e.message, cacKy: e.cacKy }, { status: 409 });
    }
    throw e;
  }
}
