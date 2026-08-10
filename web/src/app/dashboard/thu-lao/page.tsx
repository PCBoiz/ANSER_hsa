import Link from "next/link";
import { redirect } from "next/navigation";
import ThuLao from "@/components/dashboard/ThuLao";
import { yeuCauVaiTro } from "@/server/session";
import { danhSachGiaoVien, danhSachThuLao } from "@/server/store/giaoVien";
import { kiemTraBacThue } from "@/server/store/thamSo";
import { laKyHopLe, suyKyTuNgay } from "@/server/tinhToan/soThuChi";

export const dynamic = "force-dynamic";

const tien = (n: number) => new Intl.NumberFormat("vi-VN").format(n) + "đ";

export default async function TrangThuLao({
  searchParams,
}: {
  searchParams: Promise<{ ky?: string }>;
}) {
  // Thù lao là dữ liệu nhạy cảm nội bộ — trợ giảng không được thấy mức của
  // người khác. Đây là ranh giới mà bốn cấp vai trò sinh ra để giữ.
  if (!(await yeuCauVaiTro("ke_toan"))) redirect("/dashboard");

  const sp = await searchParams;
  const homNay = suyKyTuNgay(new Date().toISOString().slice(0, 10))!;
  const ky = sp.ky && laKyHopLe(sp.ky) ? sp.ky : homNay;

  const [gv, daChot, bac] = await Promise.all([
    danhSachGiaoVien(),
    danhSachThuLao(ky),
    kiemTraBacThue(),
  ]);

  const thang = [0, 1, 2, 3].map((i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Thù lao giáo viên</h1>
          <p className="mt-1 text-sm text-white/50">
            Thỉnh giảng — tính theo buổi, khấu trừ TNCN 10% theo ngưỡng đang áp dụng
          </p>
        </div>
        <nav className="flex flex-wrap gap-1">
          {thang.map((k) => (
            <Link
              key={k}
              href={`/dashboard/thu-lao?ky=${k}`}
              className={`rounded-lg px-3 py-1.5 text-sm ${
                k === ky ? "bg-white/15 font-medium text-white" : "text-white/50 hover:bg-white/5"
              }`}
            >
              {k}
            </Link>
          ))}
        </nav>
      </header>

      {/* Biểu thuế luỹ tiến KHÔNG dùng ở đây — thỉnh giảng khấu trừ thẳng 10%.
          Nhưng nếu nó hở bậc thì phần tính lương nhân viên cơ hữu sẽ dừng, nên
          vẫn nói ra để không ai tưởng mọi thứ đã sẵn sàng. */}
      {!bac.du && (
        <p className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-white/50">
          Biểu thuế luỹ tiến còn hở bậc — không ảnh hưởng trang này (thỉnh giảng khấu trừ thẳng 10%),
          nhưng phần tính lương nhân viên cơ hữu sẽ chưa chạy được.
        </p>
      )}

      {daChot.length > 0 && (
        <section className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
          <h2 className="mb-3 font-semibold">Đã chốt trong kỳ {ky}</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-white/40">
                <tr>
                  <th className="pb-2 font-medium">Trước thuế</th>
                  <th className="pb-2 font-medium text-right">Khấu trừ</th>
                  <th className="pb-2 font-medium text-right">Thực nhận</th>
                  <th className="pb-2 font-medium">Ngưỡng đã dùng</th>
                  <th className="pb-2 font-medium">Cam kết 08</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {daChot.map((t) => (
                  <tr key={t.id}>
                    <td className="py-2 font-medium tabular-nums">{tien(Number(t.tongTruocThue))}</td>
                    <td className="py-2 text-right tabular-nums text-amber-300/80">
                      −{tien(Number(t.khauTruTncn))}
                    </td>
                    <td className="py-2 text-right tabular-nums text-emerald-300/80">
                      {tien(Number(t.thucNhan))}
                    </td>
                    {/* Ngưỡng ghi lại lúc chốt: ngưỡng đổi giữa chừng thì bảng cũ
                        vẫn giải thích được vì sao ra con số đó. */}
                    <td className="py-2 text-white/50">{tien(Number(t.nguongApDung))}</td>
                    <td className="py-2 text-white/50">{t.coCamKet08 ? "có" : "không"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <ThuLao ky={ky} giaoVien={gv} />
    </div>
  );
}
