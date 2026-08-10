import { NextResponse } from "next/server";
import { thongTinObject, xoaKhoiKho } from "@/server/luuTru/kho";
import { yeuCauVaiTro } from "@/server/session";
import { ghiTaiLieu, timTheoBam } from "@/server/store/taiLieu";
import { KICH_THUOC_TOI_DA, phanTichDuongDan, vaiTroToiThieuXem } from "@/server/tinhToan/taiLieu";

/**
 * Bước 2 của tải lên: server tự đi kiểm rồi mới ghi sổ.
 *
 * Trình duyệt báo "đẩy xong" là một lời khai, không phải bằng chứng. Ở đây
 * server `HEAD` thẳng lên R2 để lấy kích thước và ETag THẬT, và mọi quyết định
 * đều dựa vào con số đó:
 *
 *   - file không tồn tại  → 400, không ghi dòng nào trỏ vào hư không
 *   - vượt trần           → xoá object rồi 413. Trần được ép THẬT, không nhờ
 *                            trình duyệt tử tế
 *   - trùng nội dung      → xoá object mới rồi 409, trả về bản đã có
 *
 * `loai` và `ky` đọc ngược từ ĐƯỜNG DẪN ĐÃ KÝ, không lấy từ thân yêu cầu — đường
 * dẫn bị khoá cứng trong chữ ký nên nó là nguồn duy nhất tin được.
 */
export async function POST(request: Request) {
  const nguoiDung = await yeuCauVaiTro("ke_toan");
  if (!nguoiDung) return NextResponse.json({ message: "Không đủ quyền." }, { status: 403 });

  const b = await request.json().catch(() => ({}));
  const duongDan = String(b.duongDan ?? "");
  const ten = String(b.ten ?? "").trim();

  const phan = phanTichDuongDan(duongDan);
  if (!phan || !ten) {
    return NextResponse.json({ message: "Đường dẫn hoặc tên file không hợp lệ." }, { status: 400 });
  }
  if (vaiTroToiThieuXem(phan.loai) === "quan_ly" && !(await yeuCauVaiTro("quan_ly"))) {
    return NextResponse.json({ message: "Chỉ quản lý mới được tải hợp đồng lên." }, { status: 403 });
  }

  const tt = await thongTinObject(duongDan);
  if (!tt) {
    return NextResponse.json(
      { message: "Chưa thấy file trên kho. Có thể lần đẩy lên chưa xong." },
      { status: 400 },
    );
  }

  if (tt.kichThuoc === 0) {
    await xoaKhoiKho(duongDan).catch(() => {});
    return NextResponse.json({ message: "File rỗng." }, { status: 400 });
  }
  if (tt.kichThuoc > KICH_THUOC_TOI_DA) {
    await xoaKhoiKho(duongDan).catch(() => {});
    return NextResponse.json(
      { message: `File vượt quá ${KICH_THUOC_TOI_DA / 1024 / 1024}MB — đã huỷ.` },
      { status: 413 },
    );
  }

  const daCo = await timTheoBam(tt.etag);
  if (daCo) {
    await xoaKhoiKho(duongDan).catch(() => {});
    return NextResponse.json(
      { message: "File này đã có trong kho.", taiLieu: daCo, trung: true },
      { status: 409 },
    );
  }

  const { ban } = await ghiTaiLieu({
    id: phan.id,
    duongDan,
    ten,
    loai: phan.loai,
    ky: phan.ky,
    dinhDang: tt.dinhDang,
    kichThuoc: tt.kichThuoc,
    bamNoiDung: tt.etag,
    nguoiTaiLenId: nguoiDung.id,
    ghiChu: b.ghiChu ? String(b.ghiChu) : null,
  });

  return NextResponse.json({ taiLieu: ban }, { status: 201 });
}
