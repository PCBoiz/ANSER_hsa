"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type TongHop = {
  tongThu: number;
  tongChi: number;
  lai: number;
  thuDaKeKhai: number;
  soDongChuaQuyet: number;
};
export type DongKy = {
  ky: string;
  trangThai: "mo" | "dang_chot" | "da_khoa";
  khoaLuc: string | null;
  ghiChu: string | null;
  tongHop: TongHop;
};

const tien = (n: number) => new Intl.NumberFormat("vi-VN").format(n) + "đ";

const NHAN: Record<DongKy["trangThai"], string> = {
  mo: "Đang mở",
  dang_chot: "Đang chốt",
  da_khoa: "Đã khoá sổ",
};
const MAU: Record<DongKy["trangThai"], string> = {
  mo: "text-white/60",
  dang_chot: "text-amber-300",
  da_khoa: "text-emerald-300",
};

export default function KyKeToan({ dsKy, laQuanLy }: { dsKy: DongKy[]; laQuanLy: boolean }) {
  const router = useRouter();
  const [ban, setBan] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);
  const [moKhoa, setMoKhoa] = useState<string | null>(null);
  const [lyDo, setLyDo] = useState("");

  async function doi(ky: string, trangThai: string, ghiChu?: string) {
    setBan(true);
    setLoi(null);
    const res = await fetch("/api/ky-ke-toan", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ky, trangThai, ghiChu }),
    });
    setBan(false);
    if (!res.ok) {
      setLoi((await res.json().catch(() => ({}))).message ?? `Lỗi ${res.status}`);
      return;
    }
    setMoKhoa(null);
    setLyDo("");
    router.refresh();
  }

  if (dsKy.length === 0) {
    return (
      <p className="rounded-xl border border-white/10 bg-white/[0.02] p-8 text-center text-sm text-white/40">
        Chưa có kỳ nào có dữ liệu. Ghi vài dòng vào <Link href="/dashboard/so-thu-chi" className="underline">Sổ thu chi</Link> đã.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {loi && (
        <p className="rounded-lg border border-red-400/30 bg-red-400/5 px-3 py-2 text-sm text-red-300">{loi}</p>
      )}

      {dsKy.map((k) => {
        const t = k.tongHop;
        return (
          <section key={k.ky} className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold">
                  {k.ky} <span className={`text-sm font-medium ${MAU[k.trangThai]}`}>· {NHAN[k.trangThai]}</span>
                </h3>
                {k.khoaLuc && (
                  <p className="text-xs text-white/40">
                    Khoá lúc {new Date(k.khoaLuc).toLocaleString("vi-VN")}
                  </p>
                )}
                {k.ghiChu && <p className="mt-1 text-xs text-amber-200/70">Lý do mở khoá: {k.ghiChu}</p>}
              </div>
              <Link
                href={`/dashboard/so-thu-chi?ky=${k.ky}`}
                className="text-sm text-white/50 underline hover:text-white/80"
              >
                Xem sổ kỳ này
              </Link>
            </div>

            <div className="mt-3 grid gap-3 text-sm sm:grid-cols-4">
              <p><span className="text-white/40">Doanh thu thật</span><br /><strong className="tabular-nums">{tien(t.tongThu)}</strong></p>
              <p><span className="text-white/40">Đã kê khai</span><br /><strong className="tabular-nums">{tien(t.thuDaKeKhai)}</strong></p>
              <p><span className="text-white/40">Tổng chi</span><br /><strong className="tabular-nums">{tien(t.tongChi)}</strong></p>
              <p>
                <span className="text-white/40">Lãi thật</span><br />
                <strong className={`tabular-nums ${t.lai >= 0 ? "text-emerald-300" : "text-red-300"}`}>{tien(t.lai)}</strong>
              </p>
            </div>

            {/* Điều kiện DUY NHẤT để khoá. Chốt một kỳ mà chính mình chưa biết
                phần nào sẽ vào tờ khai thì con dấu đó không có nghĩa gì. */}
            {t.soDongChuaQuyet > 0 && k.trangThai !== "da_khoa" && (
              <p className="mt-3 rounded-lg border border-sky-400/30 bg-sky-400/5 px-3 py-2 text-sm text-sky-200/80">
                Còn <strong>{t.soDongChuaQuyet} dòng chưa quyết kê khai</strong> — phải quyết hết mới
                khoá sổ được.{" "}
                <Link href={`/dashboard/so-thu-chi?ky=${k.ky}`} className="underline">
                  Đánh dấu hàng loạt
                </Link>
              </p>
            )}

            {laQuanLy && (
              <div className="mt-4 flex flex-wrap gap-2">
                {k.trangThai !== "da_khoa" ? (
                  <button
                    onClick={() => doi(k.ky, "da_khoa")}
                    disabled={ban || t.soDongChuaQuyet > 0}
                    className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black disabled:opacity-40"
                  >
                    Khoá sổ kỳ {k.ky}
                  </button>
                ) : moKhoa === k.ky ? (
                  <div className="w-full space-y-2">
                    <p className="text-sm text-amber-200/80">
                      Mở khoá một kỳ đã chốt — có thể tờ khai đã nộp rồi. Ghi lý do, nó vào nhật ký
                      và sẽ bị hỏi lại.
                    </p>
                    <input
                      value={lyDo}
                      onChange={(e) => setLyDo(e.target.value)}
                      placeholder="Ví dụ: phát hiện thiếu một phiếu thu ngày 18"
                      className="w-full rounded-lg border border-white/10 bg-[#0d0d12] px-3 py-2 text-white placeholder:text-white/25"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => doi(k.ky, "mo", lyDo)}
                        disabled={ban || !lyDo.trim()}
                        className="rounded-lg bg-amber-500/25 px-4 py-2 text-sm font-medium text-amber-100 disabled:opacity-40"
                      >
                        Mở khoá
                      </button>
                      <button onClick={() => setMoKhoa(null)} className="px-4 py-2 text-sm text-white/50">
                        Thôi
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setMoKhoa(k.ky)}
                    disabled={ban}
                    className="rounded-lg bg-white/10 px-4 py-2 text-sm hover:bg-white/15 disabled:opacity-40"
                  >
                    Mở khoá
                  </button>
                )}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
