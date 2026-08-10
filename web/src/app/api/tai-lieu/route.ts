import { NextResponse } from "next/server";
import { bienConThieu, dayLen, khoCauHinhChua } from "@/server/luuTru/kho";
import { yeuCauVaiTro } from "@/server/session";
import { bamNoiDung, danhSachTaiLieu, ghiTaiLieu, timTheoBam } from "@/server/store/taiLieu";
import {
  KICH_THUOC_TOI_DA,
  chuanHoaKy,
  laLoaiHopLe,
  vaiTroToiThieuXem,
  type LoaiTaiLieu,
} from "@/server/tinhToan/taiLieu";
import type { VaiTro } from "@/server/store/users";

export async function GET(request: Request) {
  const nguoiDung = await yeuCauVaiTro("ke_toan");
  if (!nguoiDung) return NextResponse.json({ message: "Không đủ quyền." }, { status: 403 });

  const q = new URL(request.url).searchParams;

  let loai: LoaiTaiLieu | undefined;
  const loaiRaw = q.get("loai");
  if (loaiRaw !== null && loaiRaw !== "") {
    if (!laLoaiHopLe(loaiRaw)) {
      return NextResponse.json({ message: "Loại tài liệu không hợp lệ." }, { status: 400 });
    }
    loai = loaiRaw;
  }

  const { ky, loi } = chuanHoaKy(q.get("ky"));
  if (loi) return NextResponse.json({ message: loi }, { status: 400 });

  const ds = await danhSachTaiLieu(nguoiDung.vaiTro as VaiTro, { loai, ky: ky ?? undefined });
  return NextResponse.json({ taiLieu: ds });
}

export async function POST(request: Request) {
  const nguoiDung = await yeuCauVaiTro("ke_toan");
  if (!nguoiDung) return NextResponse.json({ message: "Không đủ quyền." }, { status: 403 });

  if (!khoCauHinhChua()) {
    return NextResponse.json(
      {
        message:
          `Kho file chưa được cấu hình. Thiếu biến: ${bienConThieu().join(", ")}. ` +
          "Xem web/.env.example.",
      },
      { status: 503 },
    );
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!form || !(file instanceof File)) {
    return NextResponse.json({ message: "Thiếu file." }, { status: 400 });
  }
  if (file.size === 0) return NextResponse.json({ message: "File rỗng." }, { status: 400 });
  if (file.size > KICH_THUOC_TOI_DA) {
    return NextResponse.json(
      { message: `File vượt quá ${KICH_THUOC_TOI_DA / 1024 / 1024}MB.` },
      { status: 413 },
    );
  }

  const loai = form.get("loai");
  if (!laLoaiHopLe(loai)) {
    return NextResponse.json({ message: "Chọn loại tài liệu." }, { status: 400 });
  }
  // Hợp đồng lao động có mức lương từng người — kế toán tải được chứng từ nhưng
  // không được tự đưa hợp đồng vào kho.
  if (vaiTroToiThieuXem(loai) === "quan_ly" && !(await yeuCauVaiTro("quan_ly"))) {
    return NextResponse.json(
      { message: "Chỉ quản lý mới được tải hợp đồng lên." },
      { status: 403 },
    );
  }

  const { ky, loi } = chuanHoaKy(form.get("ky"));
  if (loi) return NextResponse.json({ message: loi }, { status: 400 });

  const noiDung = new Uint8Array(await file.arrayBuffer());
  const bam = bamNoiDung(noiDung);

  // Chống trùng bằng nội dung, không bằng tên: cùng một bản xuất MISA tải lại
  // lần hai thường đã bị đổi tên, và nhân đôi kho là cách nhanh nhất làm nó
  // thành đống lộn xộn thứ hai.
  const daCo = await timTheoBam(bam);
  if (daCo) {
    return NextResponse.json(
      { message: "File này đã có trong kho.", taiLieu: daCo, trung: true },
      { status: 409 },
    );
  }

  const ten = String(form.get("ten") || file.name);
  const { ban, duongDan } = await ghiTaiLieu({
    ten,
    loai,
    ky,
    dinhDang: file.type || null,
    kichThuoc: file.size,
    bamNoiDung: bam,
    nguoiTaiLenId: nguoiDung.id,
    ghiChu: (form.get("ghiChu") as string) || null,
  });

  try {
    await dayLen(duongDan, noiDung, file.type);
  } catch (error) {
    // Ghi sổ trước, đẩy file sau. Đẩy hỏng thì phải dọn bản ghi, nếu không kho
    // có một dòng trỏ tới file không tồn tại — và cái băm của nó chặn luôn lần
    // tải lại đúng file đó.
    const { xoaTaiLieu } = await import("@/server/store/taiLieu");
    await xoaTaiLieu(ban.id);
    console.error("[kho] đẩy file hỏng, đã dọn bản ghi", { id: ban.id, error });
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Không đẩy được file lên kho." },
      { status: 502 },
    );
  }

  return NextResponse.json({ taiLieu: ban }, { status: 201 });
}
