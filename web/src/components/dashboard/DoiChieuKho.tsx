"use client";

import { useState } from "react";
import { hienKichThuoc } from "@/server/tinhToan/taiLieu";

type KetQua = {
  gioCho: number;
  moCoi: { duongDan: string; kichThuoc: number; sua: string }[];
  conCho: { duongDan: string; kichThuoc: number; sua: string }[];
  thieuFile: { id: string; ten: string; duongDan: string }[];
  khop: number;
};

/**
 * Đối chiếu kho ↔ sổ, dành cho quản lý.
 *
 * Luôn phải bấm xem trước rồi mới bấm dọn được: nút dọn chỉ hiện sau khi đã có
 * kết quả đối chiếu, và nó nói rõ sắp xoá bao nhiêu file. Xoá file mà không cho
 * người ta nhìn danh sách trước là thứ chỉ cần sai một lần đã hết cứu.
 */
export default function DoiChieuKho() {
  const [kq, setKq] = useState<KetQua | null>(null);
  const [dangChay, setDangChay] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);
  const [daDon, setDaDon] = useState<string | null>(null);

  async function goi(phuongThuc: "GET" | "POST") {
    setDangChay(true);
    setLoi(null);
    try {
      const r = await fetch("/api/tai-lieu/doi-chieu-kho", { method: phuongThuc });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        setLoi(d.message ?? `Lỗi ${r.status}.`);
        return;
      }
      if (phuongThuc === "GET") {
        setKq(d);
        setDaDon(null);
      } else {
        const hong = (d.hong ?? []).length;
        setDaDon(
          `Đã xoá ${d.daXoa.length} file mồ côi.` + (hong > 0 ? ` ${hong} file xoá không được.` : ""),
        );
        setKq(null);
      }
    } catch {
      setLoi("Không gọi được máy chủ.");
    } finally {
      setDangChay(false);
    }
  }

  const NUT = "rounded-lg px-3 py-1.5 text-xs font-medium disabled:opacity-40";

  return (
    <section className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">Đối chiếu kho với sổ</h2>
          <p className="mt-1 text-sm text-white/50">
            File đẩy lên giữa chừng rồi đóng tab sẽ nằm lại trên kho mà không có trong danh sách. Ở
            đây soi ra được, và dọn được.
          </p>
        </div>
        <button onClick={() => goi("GET")} disabled={dangChay} className={`${NUT} bg-white/10 hover:bg-white/15`}>
          {dangChay ? "Đang soi…" : "Soi kho"}
        </button>
      </div>

      {loi && <p className="mt-3 text-sm text-red-300">{loi}</p>}
      {daDon && <p className="mt-3 text-sm text-emerald-300">{daDon}</p>}

      {kq && (
        <div className="mt-4 space-y-3 text-sm">
          <p className="text-white/60">
            {kq.khop} file khớp sổ
            {kq.conCho.length > 0 && ` · ${kq.conCho.length} file mới đẩy, chưa tính (dưới ${kq.gioCho} giờ)`}
          </p>

          {kq.thieuFile.length > 0 && (
            <div className="rounded-lg border border-red-400/30 bg-red-400/5 p-3">
              <p className="font-medium text-red-200">
                {kq.thieuFile.length} dòng trong sổ không tìm thấy file
              </p>
              <p className="mt-1 text-xs text-red-100/60">
                Nặng hơn file mồ côi: bấm tải về sẽ lỗi. Không tự xoá dòng nào — dòng đó là bằng
                chứng từng có tài liệu. Cần xem lại từng cái.
              </p>
              <ul className="mt-2 space-y-0.5 font-mono text-xs text-red-100/80">
                {kq.thieuFile.map((t) => (
                  <li key={t.id}>{t.ten} — {t.duongDan}</li>
                ))}
              </ul>
            </div>
          )}

          {kq.moCoi.length === 0 ? (
            <p className="text-emerald-300">Không có file mồ côi nào.</p>
          ) : (
            <div className="rounded-lg border border-amber-400/30 bg-amber-400/5 p-3">
              <p className="font-medium text-amber-200">
                {kq.moCoi.length} file mồ côi —{" "}
                {hienKichThuoc(kq.moCoi.reduce((s, m) => s + m.kichThuoc, 0))}
              </p>
              <ul className="mt-2 space-y-0.5 font-mono text-xs text-amber-100/80">
                {kq.moCoi.map((m) => (
                  <li key={m.duongDan}>
                    {m.duongDan} — {hienKichThuoc(m.kichThuoc)} —{" "}
                    {new Date(m.sua).toLocaleString("vi-VN")}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => goi("POST")}
                disabled={dangChay}
                className={`${NUT} mt-3 bg-red-500/80 text-white hover:bg-red-500`}
              >
                Xoá {kq.moCoi.length} file này khỏi kho
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
