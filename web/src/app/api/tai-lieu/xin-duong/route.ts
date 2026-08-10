import { NextResponse } from "next/server";
import { bienConThieu, duongTaiLen, khoCauHinhChua } from "@/server/luuTru/kho";
import { yeuCauVaiTro } from "@/server/session";
import { dungDuongDan } from "@/server/store/taiLieu";
import {
  KICH_THUOC_TOI_DA,
  chuanHoaKy,
  laLoaiHopLe,
  vaiTroToiThieuXem,
} from "@/server/tinhToan/taiLieu";

/**
 * Bước 1 của tải lên: xin một URL ký sẵn.
 *
 * Server kiểm quyền và dựng đường dẫn, rồi cấp một URL chỉ ghi được vào ĐÚNG
 * đường dẫn đó, sống 10 phút. Chưa ghi gì vào sổ — bản ghi chỉ ra đời ở bước
 * xác nhận, sau khi server tự hỏi R2 xem file có thật không.
 */
export async function POST(request: Request) {
  const nguoiDung = await yeuCauVaiTro("ke_toan");
  if (!nguoiDung) return NextResponse.json({ message: "Không đủ quyền." }, { status: 403 });

  if (!khoCauHinhChua()) {
    return NextResponse.json(
      { message: `Kho file chưa được cấu hình. Thiếu biến: ${bienConThieu().join(", ")}.` },
      { status: 503 },
    );
  }

  const b = await request.json().catch(() => ({}));
  const ten = String(b.ten ?? "").trim();
  if (!ten) return NextResponse.json({ message: "Thiếu tên file." }, { status: 400 });

  const loai = b.loai;
  if (!laLoaiHopLe(loai)) return NextResponse.json({ message: "Chọn loại tài liệu." }, { status: 400 });
  if (vaiTroToiThieuXem(loai) === "quan_ly" && !(await yeuCauVaiTro("quan_ly"))) {
    return NextResponse.json({ message: "Chỉ quản lý mới được tải hợp đồng lên." }, { status: 403 });
  }

  const { ky, loi } = chuanHoaKy(b.ky);
  if (loi) return NextResponse.json({ message: loi }, { status: 400 });

  // Kiểm sớm cho người dùng biết ngay, KHÔNG phải chốt chặn thật: kích thước ở
  // đây là do trình duyệt khai. Trần thật được ép ở bước xác nhận, bằng con số
  // server tự hỏi R2.
  const duKien = Number(b.kichThuoc ?? 0);
  if (Number.isFinite(duKien) && duKien > KICH_THUOC_TOI_DA) {
    return NextResponse.json(
      { message: `File vượt quá ${KICH_THUOC_TOI_DA / 1024 / 1024}MB.` },
      { status: 413 },
    );
  }

  const { id, duongDan } = dungDuongDan({ ten, loai, ky });
  try {
    return NextResponse.json({
      id,
      duongDan,
      url: await duongTaiLen(duongDan, b.dinhDang ? String(b.dinhDang) : undefined),
    });
  } catch (e) {
    console.error("[kho] không ký được đường tải lên", e);
    return NextResponse.json({ message: "Không tạo được đường tải lên." }, { status: 502 });
  }
}
