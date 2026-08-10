"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { MUC_TT29, NHAN_MUC, type MucTt29, type TrangThaiMuc } from "@/server/tinhToan/tt29";

type PhatHien = {
  muc: string;
  nhan: string;
  mucDo: "dat" | "canh_bao" | "thieu";
  thongDiep: string;
  lechVoiDuLieu: boolean;
};

const NHAN_TT: Record<TrangThaiMuc, string> = {
  thieu: "Chưa làm",
  dang_lam: "Đang làm",
  da_cong_khai: "Đã công khai",
};

const MAU: Record<PhatHien["mucDo"], string> = {
  dat: "border-emerald-400/25 bg-emerald-400/5",
  canh_bao: "border-amber-400/30 bg-amber-400/5",
  thieu: "border-red-400/30 bg-red-400/5",
};
const CHU: Record<PhatHien["mucDo"], string> = {
  dat: "text-emerald-200",
  canh_bao: "text-amber-200",
  thieu: "text-red-200",
};

export default function HoSoTt29({
  phatHien,
  trangThai,
  gvChuaBaoCao,
}: {
  phatHien: PhatHien[];
  trangThai: Partial<Record<MucTt29, TrangThaiMuc>>;
  gvChuaBaoCao: { id: string; hoTen: string; mon: string | null }[];
}) {
  const router = useRouter();
  const [ban, setBan] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);

  async function goi(than: unknown) {
    setBan(true);
    setLoi(null);
    const res = await fetch("/api/tt29", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(than),
    });
    setBan(false);
    if (!res.ok) {
      setLoi((await res.json().catch(() => ({}))).message ?? `Lỗi ${res.status}`);
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-5">
      {loi && (
        <p className="rounded-lg border border-red-400/30 bg-red-400/5 px-3 py-2 text-sm text-red-300">{loi}</p>
      )}

      <section className="space-y-2">
        {phatHien.map((p) => (
          <div key={p.muc} className={`rounded-xl border p-4 ${MAU[p.mucDo]}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className={`font-semibold ${CHU[p.mucDo]}`}>
                  {p.nhan}
                  {p.lechVoiDuLieu && (
                    <span className="ml-2 rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-medium text-white/70">
                      lệch với dữ liệu
                    </span>
                  )}
                </p>
                <p className="mt-1 text-sm text-white/60">{p.thongDiep}</p>
              </div>

              {MUC_TT29.includes(p.muc as MucTt29) && (
                <select
                  disabled={ban}
                  value={trangThai[p.muc as MucTt29] ?? "thieu"}
                  onChange={(e) => goi({ muc: p.muc, trangThai: e.target.value })}
                  className="shrink-0 rounded-lg border border-white/10 bg-[#0d0d12] px-2 py-1 text-sm text-white"
                >
                  {(Object.keys(NHAN_TT) as TrangThaiMuc[]).map((t) => (
                    <option key={t} value={t}>
                      {NHAN_TT[t]}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Chỗ lệch nào sửa được bằng một nút thì cho nút luôn, thay vì bắt
                người dùng đi tìm màn hình khác rồi quay lại. */}
            {p.muc === "danh_sach_nguoi_day" && p.lechVoiDuLieu && p.thongDiep.includes("chưa được đánh dấu") && (
              <button
                onClick={() => goi({ hanhDong: "cong_khai_tat_ca_giao_vien" })}
                disabled={ban}
                className="mt-3 rounded-lg bg-white/10 px-3 py-1.5 text-xs hover:bg-white/15 disabled:opacity-40"
              >
                Đánh dấu tất cả giáo viên đã có trong danh sách công khai
              </button>
            )}
          </div>
        ))}
      </section>

      {gvChuaBaoCao.length > 0 && (
        <section className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
          <h3 className="font-semibold">Giáo viên trường công chưa báo cáo hiệu trưởng</h3>
          <p className="mt-1 text-sm text-white/50">
            Đi hỏi từng người rồi ghi nhận ở đây. Ghi nhận là để có dấu vết, không thay được văn bản thật.
          </p>
          <ul className="mt-3 space-y-2">
            {gvChuaBaoCao.map((g) => (
              <li key={g.id} className="flex items-center justify-between gap-3 rounded-lg bg-white/[0.03] px-3 py-2">
                <span className="text-sm">
                  {g.hoTen}
                  {g.mon && <span className="text-white/40"> · {g.mon}</span>}
                </span>
                <button
                  onClick={() => goi({ hanhDong: "ghi_nhan_bao_cao", giaoVienId: g.id })}
                  disabled={ban}
                  className="rounded-lg bg-white/10 px-3 py-1 text-xs hover:bg-white/15 disabled:opacity-40"
                >
                  Đã báo cáo
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
