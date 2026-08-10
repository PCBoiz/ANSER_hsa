import { NextResponse } from "next/server";
import { doiChieuKho, donMoCoi } from "@/server/luuTru/doiChieuKho";
import { bienConThieu, khoCauHinhChua } from "@/server/luuTru/kho";
import { yeuCauVaiTro } from "@/server/session";
import { chuanHoaGioCho } from "@/server/tinhToan/doiChieuKho";

/**
 * GET  — xem lệch giữa kho và sổ, không đụng vào gì.
 * POST — xoá các object mồ côi đã quá hạn chờ.
 *
 * Quản lý, không phải kế toán: đây là thao tác xoá file, và danh sách trả về có
 * đường dẫn của mọi tài liệu kể cả hợp đồng.
 */

async function chan() {
  if (!(await yeuCauVaiTro("quan_ly"))) {
    return NextResponse.json({ message: "Không đủ quyền." }, { status: 403 });
  }
  if (!khoCauHinhChua()) {
    return NextResponse.json(
      { message: `Kho file chưa được cấu hình. Thiếu biến: ${bienConThieu().join(", ")}.` },
      { status: 503 },
    );
  }
  return null;
}

const docGioCho = (url: string) => chuanHoaGioCho(new URL(url).searchParams.get("gioCho"));

export async function GET(request: Request) {
  const loi = await chan();
  if (loi) return loi;
  try {
    const gioCho = docGioCho(request.url);
    return NextResponse.json({ gioCho, ...(await doiChieuKho(gioCho)) });
  } catch (e) {
    console.error("[kho] đối chiếu thất bại", e);
    return NextResponse.json({ message: "Không đọc được kho file." }, { status: 502 });
  }
}

export async function POST(request: Request) {
  const loi = await chan();
  if (loi) return loi;
  try {
    const gioCho = docGioCho(request.url);
    return NextResponse.json({ gioCho, ...(await donMoCoi(gioCho)) });
  } catch (e) {
    console.error("[kho] dọn mồ côi thất bại", e);
    return NextResponse.json({ message: "Không dọn được kho file." }, { status: 502 });
  }
}
