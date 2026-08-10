import { NextResponse } from "next/server";
import { yeuCauVaiTro } from "@/server/session";
import {
  KyDaKhoaError,
  danhSachKhoanChi,
  ghiKhoanChi,
  type DongChiMoi,
} from "@/server/store/soThuChi";
import { docNgay, docSoTien, laKyHopLe } from "@/server/tinhToan/soThuChi";

export const NHOM_CHI = [
  "thue_mat_bang",
  "dien_nuoc",
  "thu_lao",
  "luong",
  "marketing",
  "thiet_bi",
  "van_phong_pham",
  "khac",
] as const;

export async function GET(request: Request) {
  if (!(await yeuCauVaiTro("ke_toan"))) {
    return NextResponse.json({ message: "Không đủ quyền." }, { status: 403 });
  }
  const ky = new URL(request.url).searchParams.get("ky") ?? undefined;
  if (ky && !laKyHopLe(ky)) {
    return NextResponse.json({ message: "Kỳ phải là YYYY-MM." }, { status: 400 });
  }
  return NextResponse.json({ khoanChi: await danhSachKhoanChi(ky) });
}

export async function POST(request: Request) {
  const nguoiDung = await yeuCauVaiTro("ke_toan");
  if (!nguoiDung) return NextResponse.json({ message: "Không đủ quyền." }, { status: 403 });

  const body = await request.json().catch(() => null);
  const tho: unknown[] = Array.isArray(body?.dong) ? body.dong : body ? [body] : [];
  if (tho.length === 0) return NextResponse.json({ message: "Không có dòng nào." }, { status: 400 });

  const dong: DongChiMoi[] = [];
  const loi: { dong: number; ly: string }[] = [];

  tho.forEach((x, i) => {
    const d = x as Record<string, unknown>;
    const stt = i + 1;

    const ngay = docNgay(String(d.ngay ?? ""));
    if (!ngay) return void loi.push({ dong: stt, ly: `Ngày không đọc được: "${d.ngay}".` });

    const soTien = typeof d.soTien === "number" ? Math.round(d.soTien) : docSoTien(String(d.soTien ?? ""));
    if (soTien === null) return void loi.push({ dong: stt, ly: `Số tiền không đọc được: "${d.soTien}".` });
    if (soTien <= 0) return void loi.push({ dong: stt, ly: "Số tiền phải lớn hơn 0." });

    const nhom = String(d.nhom ?? "khac");
    if (!(NHOM_CHI as readonly string[]).includes(nhom)) {
      return void loi.push({ dong: stt, ly: `Nhóm chi không hợp lệ: "${nhom}".` });
    }

    dong.push({
      ngay,
      soTien,
      moTa: d.moTa ? String(d.moTa) : undefined,
      nhom,
      duocTru: Boolean(d.duocTru),
      lyDoKhongTru: d.lyDoKhongTru ? String(d.lyDoKhongTru) : undefined,
    });
  });

  if (loi.length > 0) {
    return NextResponse.json(
      { message: `${loi.length} dòng có lỗi — chưa ghi dòng nào.`, loi },
      { status: 400 },
    );
  }

  try {
    return NextResponse.json({ khoanChi: await ghiKhoanChi(dong, nguoiDung.id) }, { status: 201 });
  } catch (e) {
    if (e instanceof KyDaKhoaError) {
      return NextResponse.json({ message: e.message, cacKy: e.cacKy }, { status: 409 });
    }
    throw e;
  }
}
