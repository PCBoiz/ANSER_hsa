"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { docKhoiDan } from "@/server/tinhToan/soThuChi";

type Thu = {
  id: string;
  ngay: string;
  soTien: number;
  moTa: string | null;
  dienThue: string;
  dienKeKhai: string;
};
type Chi = {
  id: string;
  ngay: string;
  soTien: number;
  moTa: string | null;
  nhom: string;
  duocTru: boolean;
};

export const NHAN_DIEN_THUE: Record<string, string> = {
  khong_chiu: "Không chịu thuế",
  gtgt_5: "GTGT 5%",
  gtgt_10: "GTGT 10%",
  chua_quyet: "Chưa quyết",
};
export const NHAN_KE_KHAI: Record<string, string> = {
  da_ke_khai: "Đã kê khai",
  chua_ke_khai: "Chưa kê khai",
  chua_quyet: "Chưa quyết",
};
export const NHAN_NHOM_CHI: Record<string, string> = {
  thue_mat_bang: "Thuê mặt bằng",
  dien_nuoc: "Điện nước",
  thu_lao: "Thù lao giáo viên",
  luong: "Lương nhân viên",
  marketing: "Marketing",
  thiet_bi: "Thiết bị",
  van_phong_pham: "Văn phòng phẩm",
  khac: "Khác",
};

const tien = (n: number) => new Intl.NumberFormat("vi-VN").format(n) + "đ";
const O = "rounded-lg border border-white/10 bg-[#0d0d12] px-3 py-2 text-white placeholder:text-white/25";

export default function SoThuChi({
  ky,
  daKhoa,
  thu,
  chi,
}: {
  ky: string;
  daKhoa: boolean;
  thu: Thu[];
  chi: Chi[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"thu" | "chi">("thu");
  const [bao, setBao] = useState<{ loi?: string; ok?: string; dongLoi?: { dong: number; ly: string }[] }>({});
  const [dangGui, setDangGui] = useState(false);
  const [chon, setChon] = useState<Set<string>>(new Set());

  // form một dòng
  const [fNgay, setFNgay] = useState("");
  const [fTien, setFTien] = useState("");
  const [fMoTa, setFMoTa] = useState("");
  const [fDien, setFDien] = useState("chua_quyet");
  const [fNhom, setFNhom] = useState("khac");

  // khối dán
  const [khoi, setKhoi] = useState("");
  const xemTruoc = useMemo(() => (khoi.trim() ? docKhoiDan(khoi) : null), [khoi]);

  async function goi(url: string, init: RequestInit) {
    setDangGui(true);
    setBao({});
    const res = await fetch(url, { headers: { "Content-Type": "application/json" }, ...init });
    setDangGui(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setBao({ loi: data.message ?? `Lỗi ${res.status}`, dongLoi: data.loi });
      return false;
    }
    router.refresh();
    return true;
  }

  async function themMotDong() {
    const than =
      tab === "thu"
        ? { ngay: fNgay, soTien: fTien, moTa: fMoTa, dienThue: fDien }
        : { ngay: fNgay, soTien: fTien, moTa: fMoTa, nhom: fNhom };
    if (await goi(`/api/so-thu-chi/${tab}`, { method: "POST", body: JSON.stringify(than) })) {
      setFNgay("");
      setFTien("");
      setFMoTa("");
      setBao({ ok: "Đã ghi một dòng." });
    }
  }

  async function ghiCaKhoi() {
    if (!xemTruoc || xemTruoc.dong.length === 0) return;
    const than = {
      dong: xemTruoc.dong.map((d) => ({
        ngay: d.ngay,
        soTien: d.soTien,
        moTa: d.moTa,
        ...(tab === "thu" ? { dienThue: fDien } : { nhom: fNhom }),
      })),
    };
    if (await goi(`/api/so-thu-chi/${tab}`, { method: "POST", body: JSON.stringify(than) })) {
      setBao({ ok: `Đã ghi ${xemTruoc.dong.length} dòng.` });
      setKhoi("");
    }
  }

  async function danhDau(dien: string) {
    if (chon.size === 0) return;
    if (await goi("/api/so-thu-chi/ke-khai", {
      method: "PATCH",
      body: JSON.stringify({ ids: [...chon], dien }),
    })) {
      setBao({ ok: `Đã đánh dấu ${chon.size} dòng.` });
      setChon(new Set());
    }
  }

  async function xoa(id: string) {
    await goi(`/api/so-thu-chi/${tab}/${id}`, { method: "DELETE" });
  }

  const dsHienTai = tab === "thu" ? thu : chi;

  return (
    <div className="space-y-5">
      <div className="flex gap-2">
        {(["thu", "chi"] as const).map((t) => (
          <button
            key={t}
            onClick={() => {
              setTab(t);
              setChon(new Set());
              setBao({});
            }}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              tab === t ? "bg-white text-black" : "bg-white/5 text-white/60 hover:bg-white/10"
            }`}
          >
            {t === "thu" ? `Khoản thu (${thu.length})` : `Khoản chi (${chi.length})`}
          </button>
        ))}
      </div>

      {daKhoa && (
        <p className="rounded-lg border border-amber-400/30 bg-amber-400/5 px-3 py-2 text-sm text-amber-200">
          Kỳ {ky} đã khoá sổ — mọi đường ghi vào kỳ này đều bị từ chối. Mở khoá rồi mới sửa được.
        </p>
      )}
      {bao.loi && (
        <div className="rounded-lg border border-red-400/30 bg-red-400/5 px-3 py-2 text-sm text-red-300">
          <p>{bao.loi}</p>
          {bao.dongLoi && (
            <ul className="mt-1 list-inside list-disc text-red-300/70">
              {bao.dongLoi.map((l) => (
                <li key={l.dong}>Dòng {l.dong}: {l.ly}</li>
              ))}
            </ul>
          )}
        </div>
      )}
      {bao.ok && (
        <p className="rounded-lg border border-emerald-400/30 bg-emerald-400/5 px-3 py-2 text-sm text-emerald-300">
          {bao.ok}
        </p>
      )}

      {/* ── nhập một dòng ── */}
      <section className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
        <h3 className="mb-3 font-semibold">Thêm một dòng</h3>
        <div className="grid gap-3 sm:grid-cols-4">
          <input className={O} placeholder="15/07/2026" value={fNgay} onChange={(e) => setFNgay(e.target.value)} />
          <input className={O} placeholder="1.500.000" value={fTien} onChange={(e) => setFTien(e.target.value)} />
          <input className={O} placeholder="Diễn giải" value={fMoTa} onChange={(e) => setFMoTa(e.target.value)} />
          {tab === "thu" ? (
            <select className={O} value={fDien} onChange={(e) => setFDien(e.target.value)}>
              {Object.entries(NHAN_DIEN_THUE).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          ) : (
            <select className={O} value={fNhom} onChange={(e) => setFNhom(e.target.value)}>
              {Object.entries(NHAN_NHOM_CHI).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          )}
        </div>
        <button
          onClick={themMotDong}
          disabled={dangGui || daKhoa || !fNgay || !fTien}
          className="mt-3 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black disabled:opacity-40"
        >
          Ghi vào sổ
        </button>
      </section>

      {/* ── dán từ Excel ── */}
      <section className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
        <h3 className="font-semibold">Dán từ Excel</h3>
        <p className="mt-1 text-sm text-white/50">
          Chọn vùng trong Excel rồi dán vào đây. Ba cột theo đúng thứ tự:{" "}
          <strong className="text-white/70">ngày · số tiền · diễn giải</strong>. Dòng tiêu đề bỏ qua được.
        </p>
        <textarea
          value={khoi}
          onChange={(e) => setKhoi(e.target.value)}
          rows={5}
          placeholder={"15/07/2026\t1.500.000\tHọc phí Toán T7\n20/07/2026\t800.000\tBán tài liệu"}
          className={`${O} mt-3 w-full font-mono text-xs`}
        />

        {xemTruoc && (
          <div className="mt-3 space-y-2 text-sm">
            <p className="text-white/60">
              Đọc được <strong className="text-emerald-300">{xemTruoc.dong.length}</strong> dòng
              {xemTruoc.loi.length > 0 && (
                <>
                  , <strong className="text-red-300">{xemTruoc.loi.length}</strong> dòng lỗi
                </>
              )}
              .
            </p>
            {xemTruoc.loi.length > 0 && (
              <ul className="list-inside list-disc text-xs text-red-300/80">
                {xemTruoc.loi.slice(0, 8).map((l) => (
                  <li key={l.dong}>Dòng {l.dong}: {l.ly}</li>
                ))}
              </ul>
            )}
            {xemTruoc.dong.length > 0 && (
              <div className="overflow-x-auto rounded-lg border border-white/10">
                <table className="w-full text-xs">
                  <tbody className="divide-y divide-white/5">
                    {xemTruoc.dong.slice(0, 5).map((d) => (
                      <tr key={d.dong}>
                        <td className="px-3 py-1.5 text-white/50">{d.ngay}</td>
                        <td className="px-3 py-1.5 text-right tabular-nums">{tien(d.soTien)}</td>
                        <td className="px-3 py-1.5 text-white/60">{d.moTa}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {xemTruoc.dong.length > 5 && (
                  <p className="px-3 py-1.5 text-xs text-white/35">…và {xemTruoc.dong.length - 5} dòng nữa</p>
                )}
              </div>
            )}
            <button
              onClick={ghiCaKhoi}
              disabled={dangGui || daKhoa || xemTruoc.dong.length === 0 || xemTruoc.loi.length > 0}
              className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black disabled:opacity-40"
            >
              Ghi {xemTruoc.dong.length} dòng vào sổ
            </button>
            {xemTruoc.loi.length > 0 && (
              <p className="text-xs text-white/40">
                Sửa hết dòng lỗi rồi mới ghi được — ghi một nửa là để lại cái sổ mà chính người nhập
                cũng không biết đã vào tới đâu.
              </p>
            )}
          </div>
        )}
      </section>

      {/* ── bảng ── */}
      <section className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <h3 className="font-semibold">Sổ {tab === "thu" ? "thu" : "chi"} kỳ {ky}</h3>
          {tab === "thu" && chon.size > 0 && (
            <div className="flex gap-2">
              <span className="self-center text-sm text-white/50">Đã chọn {chon.size}:</span>
              <button
                onClick={() => danhDau("da_ke_khai")}
                disabled={dangGui || daKhoa}
                className="rounded-lg bg-emerald-500/15 px-3 py-1 text-xs text-emerald-200 hover:bg-emerald-500/25 disabled:opacity-40"
              >
                Đánh dấu đã kê khai
              </button>
              <button
                onClick={() => danhDau("chua_ke_khai")}
                disabled={dangGui || daKhoa}
                className="rounded-lg bg-white/10 px-3 py-1 text-xs hover:bg-white/15 disabled:opacity-40"
              >
                Đánh dấu chưa kê khai
              </button>
            </div>
          )}
        </div>

        {dsHienTai.length === 0 ? (
          <p className="py-6 text-center text-sm text-white/35">Kỳ này chưa có dòng nào.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-white/40">
                <tr>
                  {tab === "thu" && (
                    <th className="pb-2 w-8">
                      <input
                        type="checkbox"
                        checked={chon.size === thu.length && thu.length > 0}
                        onChange={(e) => setChon(e.target.checked ? new Set(thu.map((r) => r.id)) : new Set())}
                      />
                    </th>
                  )}
                  <th className="pb-2 font-medium">Ngày</th>
                  <th className="pb-2 font-medium text-right">Số tiền</th>
                  <th className="pb-2 font-medium">Diễn giải</th>
                  <th className="pb-2 font-medium">{tab === "thu" ? "Diện thuế" : "Nhóm"}</th>
                  <th className="pb-2 font-medium">{tab === "thu" ? "Kê khai" : "Được trừ"}</th>
                  <th className="pb-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {dsHienTai.map((r) => (
                  <tr key={r.id}>
                    {tab === "thu" && (
                      <td className="py-2">
                        <input
                          type="checkbox"
                          checked={chon.has(r.id)}
                          onChange={(e) => {
                            const s = new Set(chon);
                            e.target.checked ? s.add(r.id) : s.delete(r.id);
                            setChon(s);
                          }}
                        />
                      </td>
                    )}
                    <td className="py-2 text-white/60">{r.ngay}</td>
                    <td className="py-2 text-right font-medium tabular-nums">{tien(r.soTien)}</td>
                    <td className="py-2 text-white/70">{r.moTa || "—"}</td>
                    <td className="py-2 text-white/60">
                      {tab === "thu"
                        ? NHAN_DIEN_THUE[(r as Thu).dienThue]
                        : NHAN_NHOM_CHI[(r as Chi).nhom]}
                    </td>
                    <td className="py-2 text-xs">
                      {tab === "thu" ? (
                        <span
                          className={
                            (r as Thu).dienKeKhai === "da_ke_khai"
                              ? "text-emerald-300/80"
                              : (r as Thu).dienKeKhai === "chua_ke_khai"
                                ? "text-white/45"
                                : "text-sky-300/70"
                          }
                        >
                          {NHAN_KE_KHAI[(r as Thu).dienKeKhai]}
                        </span>
                      ) : (r as Chi).duocTru ? (
                        <span className="text-emerald-300/80">Được trừ</span>
                      ) : (
                        <span className="text-white/45">Không trừ</span>
                      )}
                    </td>
                    <td className="py-2 text-right">
                      <button
                        onClick={() => xoa(r.id)}
                        disabled={dangGui || daKhoa}
                        className="text-xs text-red-300/60 hover:text-red-300 disabled:opacity-30"
                      >
                        Xoá
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
