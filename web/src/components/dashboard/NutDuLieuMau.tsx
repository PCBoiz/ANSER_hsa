"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Nút gieo và xoá dữ liệu mẫu.
 *
 * Xoá là thao tác không lùi được nên phải hỏi lại. Nhưng chỉ hỏi khi XOÁ —
 * gieo thì cứ gieo, vì gieo lại luôn dọn bộ cũ trước, không cộng dồn.
 */
export default function NutDuLieuMau({ dangCo }: { dangCo: boolean }) {
  const router = useRouter();
  const [ban, setBan] = useState(false);
  const [bao, setBao] = useState<string | null>(null);
  const [hoiXoa, setHoiXoa] = useState(false);

  async function goi(method: "POST" | "DELETE") {
    setBan(true);
    setBao(null);
    const res = await fetch("/api/du-lieu-mau", { method });
    const d = await res.json().catch(() => ({}));
    setBan(false);
    setHoiXoa(false);
    if (!res.ok) {
      setBao(d.message ?? `Lỗi ${res.status}`);
      return;
    }
    if (method === "POST") {
      const g = d.daGieo;
      setBao(
        `Đã gieo kỳ ${g.ky}: ${g.giaoVien} giáo viên · ${g.buoiDay} buổi dạy · ${g.lopHoc} lớp · ` +
          `${g.khoanThu} khoản thu · ${g.khoanChi} khoản chi.`,
      );
    } else {
      setBao(`Đã xoá: ${Object.entries(d.daXoa).map(([k, v]) => `${k} ${v}`).join(" · ")}`);
    }
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => goi("POST")}
          disabled={ban}
          className="rounded-lg bg-white/10 px-4 py-2 text-sm hover:bg-white/15 disabled:opacity-40"
        >
          {dangCo ? "Gieo lại dữ liệu mẫu" : "Gieo dữ liệu mẫu"}
        </button>
        {dangCo && !hoiXoa && (
          <button
            onClick={() => setHoiXoa(true)}
            disabled={ban}
            className="rounded-lg bg-red-500/15 px-4 py-2 text-sm text-red-200 hover:bg-red-500/25 disabled:opacity-40"
          >
            Xoá dữ liệu mẫu
          </button>
        )}
        {hoiXoa && (
          <>
            <button
              onClick={() => goi("DELETE")}
              disabled={ban}
              className="rounded-lg bg-red-500/25 px-4 py-2 text-sm font-medium text-red-100 disabled:opacity-40"
            >
              Xoá thật — giữ nguyên dữ liệu đã nhập
            </button>
            <button onClick={() => setHoiXoa(false)} className="rounded-lg px-4 py-2 text-sm text-white/50">
              Thôi
            </button>
          </>
        )}
      </div>
      {bao && <p className="text-sm text-white/60">{bao}</p>}
    </div>
  );
}
