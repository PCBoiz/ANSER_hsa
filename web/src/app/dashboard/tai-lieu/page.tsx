import Link from "next/link";
import { redirect } from "next/navigation";
import DoiChieuKho from "@/components/dashboard/DoiChieuKho";
import TaiLenTaiLieu from "@/components/dashboard/TaiLenTaiLieu";
import { bienConThieu, khoCauHinhChua } from "@/server/luuTru/kho";
import { yeuCauVaiTro } from "@/server/session";
import { danhSachTaiLieu } from "@/server/store/taiLieu";
import type { VaiTro } from "@/server/store/users";
import { NHAN_LOAI_TAI_LIEU, hienKichThuoc, type LoaiTaiLieu } from "@/server/tinhToan/taiLieu";

export const dynamic = "force-dynamic";

export default async function TrangTaiLieu() {
  const nguoiDung = await yeuCauVaiTro("ke_toan");
  if (!nguoiDung) redirect("/dashboard");

  const ds = await danhSachTaiLieu(nguoiDung.vaiTro as VaiTro);
  const laQuanLy = ["quan_ly", "admin"].includes(nguoiDung.vaiTro);

  // Gom theo kỳ, kỳ mới nhất lên trên, tài liệu không thuộc kỳ nào xuống cuối.
  const theoKy = new Map<string, typeof ds>();
  for (const t of ds) {
    const k = t.ky ?? "";
    if (!theoKy.has(k)) theoKy.set(k, []);
    theoKy.get(k)!.push(t);
  }
  const cacKy = [...theoKy.keys()].sort((a, b) => (a === "" ? 1 : b === "" ? -1 : b.localeCompare(a)));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Kho tài liệu</h1>
        <p className="mt-1 text-sm text-white/50">
          {ds.length} tài liệu · một chỗ thay cho máy cá nhân và Google Drive
        </p>
      </header>

      {!khoCauHinhChua() && (
        <section className="rounded-xl border border-amber-400/30 bg-amber-400/5 p-4 text-sm">
          <p className="font-semibold text-amber-200">Kho file chưa được cấu hình</p>
          <p className="mt-1 text-amber-100/70">
            Thiếu biến môi trường: <code className="font-mono">{bienConThieu().join(", ")}</code>. Xem{" "}
            <code className="font-mono">web/.env.example</code>. Danh sách vẫn xem được, nhưng chưa tải
            lên hay tải về được.
          </p>
        </section>
      )}

      <TaiLenTaiLieu duocTaiHopDong={laQuanLy} />

      {laQuanLy && khoCauHinhChua() && <DoiChieuKho />}

      {ds.length === 0 ? (
        <p className="rounded-xl border border-white/10 bg-white/[0.02] p-8 text-center text-sm text-white/40">
          Kho còn trống. Tải file đầu tiên lên ở khung trên.
        </p>
      ) : (
        cacKy.map((k) => (
          <section key={k || "khong-ky"} className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
            <h2 className="mb-3 font-semibold">
              {k || <span className="text-white/50">Không thuộc kỳ nào</span>}
              <span className="ml-2 text-xs font-normal text-white/40">
                {theoKy.get(k)!.length} tài liệu
              </span>
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-sm">
                <thead className="text-left text-xs uppercase tracking-wide text-white/40">
                  <tr>
                    <th className="pb-2 font-medium">Tên</th>
                    <th className="pb-2 font-medium">Loại</th>
                    <th className="pb-2 font-medium">Cỡ</th>
                    <th className="pb-2 font-medium">Tải lên</th>
                    <th className="pb-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {theoKy.get(k)!.map((t) => (
                    <tr key={t.id}>
                      <td className="py-2 pr-3">
                        {t.ten}
                        {t.nguon === "mau" && (
                          <span className="ml-2 rounded bg-amber-400/15 px-1.5 py-0.5 text-[10px] text-amber-200">
                            mẫu
                          </span>
                        )}
                      </td>
                      <td className="py-2 pr-3 text-white/60">
                        {NHAN_LOAI_TAI_LIEU[t.loai as LoaiTaiLieu]}
                      </td>
                      <td className="py-2 pr-3 tabular-nums text-white/60">
                        {hienKichThuoc(t.kichThuoc)}
                      </td>
                      <td className="py-2 pr-3 text-white/40">
                        {new Date(t.taoLuc).toLocaleDateString("vi-VN")}
                      </td>
                      <td className="py-2 text-right">
                        <Link
                          href={`/api/tai-lieu/${t.id}/tai`}
                          className="rounded-lg bg-white/10 px-3 py-1 text-xs hover:bg-white/15"
                        >
                          Tải về
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))
      )}
    </div>
  );
}
