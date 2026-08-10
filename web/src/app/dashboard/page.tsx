import { desc } from "drizzle-orm";
import NutDuLieuMau from "@/components/dashboard/NutDuLieuMau";
import { coDuLieuMau } from "@/server/duLieuMau/gieo";
import { db } from "@/server/db/client";
import { bacThueTncn, thamSoPhapLy } from "@/server/db/schema";
import { layNguoiDungTuPhien } from "@/server/session";
import { demChuaDuyet, kiemTraBacThue } from "@/server/store/thamSo";
import { NHAN_VAI_TRO, type VaiTro } from "@/server/store/users";

export const dynamic = "force-dynamic";

const DINH_DANG = new Intl.NumberFormat("vi-VN");

function hienGiaTri(giaTri: string, donVi: string) {
  const n = Number(giaTri);
  if (donVi === "vnd") return `${DINH_DANG.format(n)}đ`;
  if (donVi === "phan_tram") return `${n}%`;
  return String(n);
}

export default async function TrangChu() {
  const nguoiDung = await layNguoiDungTuPhien();
  const thamSo = await db.select().from(thamSoPhapLy).orderBy(desc(thamSoPhapLy.hieuLucTu));
  const bac = await db.select().from(bacThueTncn).orderBy(bacThueTncn.bac);
  const kiemTra = await kiemTraBacThue();
  const chuaDuyet = await demChuaDuyet();
  const coMau = await coDuLieuMau();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">
          Chào {nguoiDung ? `${nguoiDung.ho} ${nguoiDung.ten}` : "bạn"}
        </h1>
        <p className="mt-1 text-sm text-white/50">
          {nguoiDung ? NHAN_VAI_TRO[nguoiDung.vaiTro as VaiTro] : "Chưa đăng nhập"} · giai đoạn 1 — kho chứng từ

        </p>
      </header>

      {/* Cảnh báo đứng trên cùng, không giấu dưới đáy trang: bảng thuế thiếu bậc
          nghĩa là chưa tính được lương, và đó là thứ phải biết ngay. */}
      {!kiemTra.du && (
        <section className="rounded-xl border border-amber-400/30 bg-amber-400/5 p-4">
          <h2 className="font-semibold text-amber-200">Biểu thuế luỹ tiến chưa đủ bậc</h2>
          <ul className="mt-2 list-inside list-disc text-sm text-amber-100/70">
            {kiemTra.thieu.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-amber-100/60">
            Tính lương và khấu trừ TNCN sẽ <strong>từ chối chạy</strong> cho tới khi tra đủ. Điền bừa các
            bậc còn thiếu là sai số thuế của từng người từng tháng — loại lỗi không ai phát hiện tới lúc
            quyết toán.
          </p>
        </section>
      )}

      {/* Banner này phải đứng TRÊN mọi con số. Khách chụp màn hình một bảng
          doanh thu toàn số giả rồi tưởng là thật thì với sản phẩm kế toán đó
          không phải phiền toái — đó là mất khách. */}
      {coMau && (
        <section className="rounded-xl border border-amber-400/40 bg-amber-400/10 p-4">
          <p className="font-semibold text-amber-200">Đang có dữ liệu mẫu trong hệ thống</p>
          <p className="mt-1 text-sm text-amber-100/70">
            Mọi con số ở các màn hình khác đang lẫn dữ liệu mẫu. Đây là bộ đề có đáp án dựng sẵn để
            bấm thử — <strong>không phải số liệu thật</strong>. Xoá nó đi thì dữ liệu đã nhập tay vẫn
            còn nguyên, vì mỗi dòng đều biết mình là mẫu hay thật.
          </p>
        </section>
      )}

      {chuaDuyet.thamSo + chuaDuyet.bacThue > 0 && (
        <section className="rounded-xl border border-sky-400/30 bg-sky-400/5 p-4">
          <h2 className="font-semibold text-sky-200">Chưa có kế toán rà lại</h2>
          <p className="mt-2 text-sm text-sky-100/70">
            {chuaDuyet.thamSo} tham số và {chuaDuyet.bacThue} bậc thuế do máy tra về, <strong>có ghi
            nguồn văn bản nhưng chưa ai xác nhận</strong>. Số vẫn dùng được để chạy thử, nhưng mọi bảng
            tính từ chúng phải hiểu là bản nháp.
          </p>
          <p className="mt-2 text-sm text-sky-100/50">
            Một bảng lương sai vì tra nhầm số trông giống hệt một bảng lương đúng — đó là lý do trạng
            thái này nằm ngay đây thay vì trong nhật ký.
          </p>
        </section>
      )}

      <section className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
        <h2 className="font-semibold">Dữ liệu mẫu</h2>
        <p className="mb-3 mt-1 text-sm text-white/50">
          Một trung tâm hư cấu với lỗi gieo sẵn: giáo viên trường công chưa báo cáo hiệu trưởng, lớp
          thiếu môn, lớp thiếu học phí, ba khoản thu chưa quyết kê khai, một khoản chi không hoá đơn.
          Các bộ soi phải tìm ra đúng ngần ấy và không gắn cờ oan thứ gì khác.
        </p>
        <NutDuLieuMau dangCo={coMau} />
      </section>

      <section className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="font-semibold">Tham số pháp lý đang áp dụng</h2>
          <span className="text-xs text-white/40">{thamSo.length} tham số · tra nguồn 10/08/2026</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-white/40">
              <tr>
                <th className="pb-2 font-medium">Mã</th>
                <th className="pb-2 font-medium">Giá trị</th>
                <th className="pb-2 font-medium">Hiệu lực từ</th>
                <th className="pb-2 font-medium">Căn cứ</th>
                <th className="pb-2 font-medium">Rà soát</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {thamSo.map((t) => (
                <tr key={t.id}>
                  <td className="py-2 font-mono text-xs text-white/70">{t.ma}</td>
                  <td className="py-2 font-medium tabular-nums">{hienGiaTri(t.giaTri, t.donVi)}</td>
                  <td className="py-2 text-white/50">{t.hieuLucTu}</td>
                  <td className="py-2 text-xs text-white/40">{t.nguonVanBan}</td>
                  <td className="py-2 text-xs">
                    {t.daDuyet ? (
                      <span className="text-emerald-300/70">đã rà</span>
                    ) : (
                      <span className="text-sky-300/60">chưa rà</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-xs text-white/40">
          Đổi luật là thêm một dòng vào bảng này, không sửa code. Dòng cũ giữ nguyên để bảng lương tháng
          trước vẫn giải thích được vì sao ra con số đó.
        </p>
      </section>

      <section className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
        <h2 className="mb-4 font-semibold">
          Biểu thuế luỹ tiến <span className="text-sm font-normal text-white/40">({bac.length}/5 bậc)</span>
        </h2>
        <ul className="space-y-1 text-sm">
          {bac.map((b) => (
            <li key={b.id} className="flex gap-3">
              <span className="w-14 text-white/40">Bậc {b.bac}</span>
              <span className="tabular-nums">
                {DINH_DANG.format(Number(b.tuThuNhap))}
                {b.denThuNhap === null ? " trở lên" : ` – ${DINH_DANG.format(Number(b.denThuNhap))}`}
              </span>
              <span className="font-medium text-white/80">{Number(b.thueSuat)}%</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
