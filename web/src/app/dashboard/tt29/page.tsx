import { redirect } from "next/navigation";
import HoSoTt29 from "@/components/dashboard/HoSoTt29";
import { yeuCauVaiTro } from "@/server/session";
import { gvTruongCongChuaBaoCao, soi } from "@/server/store/tt29";
import type { MucTt29, TrangThaiMuc } from "@/server/tinhToan/tt29";

export const dynamic = "force-dynamic";

export default async function TrangTt29() {
  if (!(await yeuCauVaiTro("ke_toan"))) redirect("/dashboard");

  const [{ ketQua, hoSo }, gvChuaBaoCao] = await Promise.all([soi(), gvTruongCongChuaBaoCao()]);
  const trangThai = Object.fromEntries(hoSo.map((h) => [h.muc, h.trangThai])) as Partial<
    Record<MucTt29, TrangThaiMuc>
  >;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Hồ sơ TT29</h1>
        <p className="mt-1 text-sm text-white/50">
          Thông tư 29/2024/TT-BGDĐT — sáu mục bắt buộc công khai <strong>trước khi tuyển sinh</strong>
        </p>
      </header>

      <section
        className={`rounded-xl border p-5 ${
          ketQua.sanSangTuyenSinh
            ? "border-emerald-400/30 bg-emerald-400/5"
            : "border-amber-400/30 bg-amber-400/5"
        }`}
      >
        <p className={`text-lg font-bold ${ketQua.sanSangTuyenSinh ? "text-emerald-200" : "text-amber-200"}`}>
          {ketQua.sanSangTuyenSinh
            ? "Đủ điều kiện công khai trước tuyển sinh"
            : `Còn ${ketQua.soThieu} mục chưa làm, ${ketQua.soCanhBao} chỗ cần xem lại`}
        </p>
        {ketQua.soLech > 0 && (
          <p className="mt-2 text-sm text-amber-100/70">
            <strong>{ketQua.soLech} chỗ lệch giữa lời khai và dữ liệu trong hệ thống.</strong> Đây là
            phần đáng xem nhất — đánh dấu &quot;đã công khai&quot; thì ai cũng làm được, nhưng bản
            công khai thiếu người hay thiếu môn thì vẫn là bản công khai sai.
          </p>
        )}
        {!ketQua.sanSangTuyenSinh && (
          <p className="mt-2 text-sm text-amber-100/60">
            Mức phạt và rủi ro ở đây không phải chuyện phần mềm — nhưng danh sách người dạy là thứ
            bắt buộc công khai, nên những gì thiếu ở đây là thứ không giấu được.
          </p>
        )}
      </section>

      <HoSoTt29 phatHien={ketQua.phatHien} trangThai={trangThai} gvChuaBaoCao={gvChuaBaoCao} />
    </div>
  );
}
