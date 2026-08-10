import Link from "next/link";
import { redirect } from "next/navigation";
import SoThuChi from "@/components/dashboard/SoThuChi";
import { yeuCauVaiTro } from "@/server/session";
import {
  cacKyCoDuLieu,
  danhSachKhoanChi,
  danhSachKhoanThu,
  tongHopKy,
} from "@/server/store/soThuChi";
import { laKyHopLe, suyKyTuNgay } from "@/server/tinhToan/soThuChi";

export const dynamic = "force-dynamic";

const tien = (n: number) => new Intl.NumberFormat("vi-VN").format(n) + "đ";

function O({
  nhan,
  gia,
  phu,
  mau,
}: {
  nhan: string;
  gia: string;
  phu?: string;
  mau?: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <p className="text-xs uppercase tracking-wide text-white/40">{nhan}</p>
      <p className={`mt-1 text-xl font-bold tabular-nums ${mau ?? ""}`}>{gia}</p>
      {phu && <p className="mt-0.5 text-xs text-white/40">{phu}</p>}
    </div>
  );
}

export default async function TrangSoThuChi({
  searchParams,
}: {
  searchParams: Promise<{ ky?: string }>;
}) {
  if (!(await yeuCauVaiTro("ke_toan"))) redirect("/dashboard");

  const sp = await searchParams;
  const cacKy = await cacKyCoDuLieu();
  const homNay = suyKyTuNgay(new Date().toISOString().slice(0, 10))!;
  const ky = sp.ky && laKyHopLe(sp.ky) ? sp.ky : (cacKy[0] ?? homNay);

  const [th, thu, chi] = await Promise.all([tongHopKy(ky), danhSachKhoanThu(ky), danhSachKhoanChi(ky)]);
  const dsKy = [...new Set([homNay, ...cacKy])].sort().reverse();

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Sổ thu chi</h1>
          <p className="mt-1 text-sm text-white/50">
            Một sổ duy nhất — học phí, bán tài liệu, chi phí đều ghi ở đây
          </p>
        </div>
        <nav className="flex flex-wrap gap-1">
          {dsKy.map((k) => (
            <Link
              key={k}
              href={`/dashboard/so-thu-chi?ky=${k}`}
              className={`rounded-lg px-3 py-1.5 text-sm ${
                k === ky ? "bg-white/15 font-medium text-white" : "text-white/50 hover:bg-white/5"
              }`}
            >
              {k}
            </Link>
          ))}
        </nav>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <O nhan="Doanh thu thật" gia={tien(th.tongThu)} phu="toàn bộ tiền vào trong kỳ" />
        <O
          nhan="Đã kê khai"
          gia={tien(th.thuDaKeKhai)}
          phu={
            th.tongThu > 0
              ? `${Math.round((th.thuDaKeKhai / th.tongThu) * 100)}% doanh thu thật`
              : "chưa có dòng nào"
          }
        />
        <O nhan="Tổng chi" gia={tien(th.tongChi)} phu={`được trừ ${tien(th.chiDuocTru)}`} />
        <O
          nhan="Lãi thật"
          gia={tien(th.lai)}
          phu="doanh thu thật trừ toàn bộ chi"
          mau={th.lai >= 0 ? "text-emerald-300" : "text-red-300"}
        />
      </div>

      {/* Hai con số cạnh nhau ở trên là điểm chính của cả sản phẩm. Nhưng chúng
          chỉ có nghĩa khi không còn dòng nào "chưa ai quyết" — nếu còn thì phần
          chênh giữa doanh thu thật và đã kê khai là một hỗn hợp của "quyết không
          kê" và "quên chưa xem", mà hai thứ đó khác hẳn nhau. */}
      {th.soDongChuaQuyet > 0 && (
        <section className="rounded-xl border border-sky-400/30 bg-sky-400/5 p-4 text-sm">
          <p className="font-semibold text-sky-200">
            {th.soDongChuaQuyet} dòng chưa quyết kê khai — {tien(th.thuChuaQuyet)}
          </p>
          <p className="mt-1 text-sky-100/60">
            Chừng nào còn dòng chưa quyết thì phần chênh giữa <em>doanh thu thật</em> và{" "}
            <em>đã kê khai</em> là hỗn hợp của &quot;đã quyết không kê&quot; và &quot;quên chưa
            xem&quot;. Hai thứ đó khác hẳn nhau, nên báo cáo thuế sẽ từ chối chạy khi còn dòng
            chưa quyết.
          </p>
          <p className="mt-1 text-sky-100/50">
            Chọn nhiều dòng trong bảng bên dưới rồi đánh dấu một lượt.
          </p>
        </section>
      )}

      <SoThuChi ky={ky} daKhoa={th.daKhoa} thu={thu} chi={chi} />
    </div>
  );
}
