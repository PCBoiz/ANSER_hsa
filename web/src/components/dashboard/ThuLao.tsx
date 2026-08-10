"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { docKhoiDan } from "@/server/tinhToan/soThuChi";

type GV = { id: string; hoTen: string; mon: string | null; laGvTruongCong: boolean; daBaoCaoHieuTruong: boolean };
type Buoi = { id: string; ngay: string; donGia: number; soGio: string | null; tinhTheo: string; thuLaoId: string | null };
type XemTruoc = {
  hoTen: string;
  coCamKet08: boolean;
  ketQua: {
    soBuoi: number;
    tongTruocThue: number;
    apDungKhauTru: boolean;
    khauTruTncn: number;
    thucNhan: number;
    nguongApDung: number;
    lyDo: string;
    chiTiet: { ngay: string; donGia: number; soGio: number | null; thanhTien: number }[];
  };
};

const tien = (n: number) => new Intl.NumberFormat("vi-VN").format(n) + "đ";
const O = "rounded-lg border border-white/10 bg-[#0d0d12] px-3 py-2 text-white placeholder:text-white/25";

export default function ThuLao({ ky, giaoVien }: { ky: string; giaoVien: GV[] }) {
  const router = useRouter();
  const [chon, setChon] = useState<string>(giaoVien[0]?.id ?? "");
  const [buoi, setBuoi] = useState<Buoi[]>([]);
  const [xem, setXem] = useState<XemTruoc | null>(null);
  const [bao, setBao] = useState<{ loi?: string; ok?: string; dongLoi?: { dong: number; ly: string }[] }>({});
  const [ban, setBan] = useState(false);

  // thêm giáo viên
  const [gvTen, setGvTen] = useState("");
  const [gvMon, setGvMon] = useState("");
  const [gvCong, setGvCong] = useState(false);

  // khối dán buổi dạy: ngày · đơn giá · (bỏ qua)
  const [khoi, setKhoi] = useState("");
  const truoc = useMemo(() => (khoi.trim() ? docKhoiDan(khoi) : null), [khoi]);

  async function goi(url: string, init?: RequestInit) {
    setBan(true);
    setBao({});
    const res = await fetch(url, { headers: { "Content-Type": "application/json" }, ...init });
    setBan(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setBao({ loi: data.message ?? `Lỗi ${res.status}`, dongLoi: data.loi });
      return null;
    }
    return data;
  }

  async function nap(gvId = chon) {
    if (!gvId) return;
    const b = await goi(`/api/giao-vien/${gvId}/buoi-day?ky=${ky}`);
    if (b) setBuoi(b.buoiDay);
    const x = await fetch(`/api/thu-lao?giaoVienId=${gvId}&ky=${ky}`).then((r) => r.json());
    setXem(x.xemTruoc ?? null);
    if (x.message) setBao({ loi: x.message });
  }

  async function themGiaoVien() {
    const d = await goi("/api/giao-vien", {
      method: "POST",
      body: JSON.stringify({ hoTen: gvTen, mon: gvMon, laGvTruongCong: gvCong }),
    });
    if (d) {
      setGvTen("");
      setGvMon("");
      setGvCong(false);
      setBao({ ok: "Đã thêm giáo viên." });
      router.refresh();
    }
  }

  async function ghiBuoi() {
    if (!truoc || truoc.dong.length === 0 || !chon) return;
    const d = await goi(`/api/giao-vien/${chon}/buoi-day`, {
      method: "POST",
      body: JSON.stringify({
        dong: truoc.dong.map((x) => ({ ngay: x.ngay, donGia: x.soTien, tinhTheo: "buoi" })),
      }),
    });
    if (d) {
      setBao({ ok: `Đã ghi ${truoc.dong.length} buổi.` });
      setKhoi("");
      await nap();
    }
  }

  async function chot() {
    const d = await goi("/api/thu-lao", {
      method: "POST",
      body: JSON.stringify({ giaoVienId: chon, ky }),
    });
    if (d) {
      setBao({ ok: "Đã chốt bảng thù lao." });
      await nap();
      router.refresh();
    }
  }

  const gvChon = giaoVien.find((g) => g.id === chon);
  const chuaChot = buoi.filter((b) => !b.thuLaoId);

  return (
    <div className="space-y-5">
      {bao.loi && (
        <div className="rounded-lg border border-red-400/30 bg-red-400/5 px-3 py-2 text-sm text-red-300">
          <p>{bao.loi}</p>
          {bao.dongLoi && (
            <ul className="mt-1 list-inside list-disc text-red-300/70">
              {bao.dongLoi.map((l) => <li key={l.dong}>Dòng {l.dong}: {l.ly}</li>)}
            </ul>
          )}
        </div>
      )}
      {bao.ok && (
        <p className="rounded-lg border border-emerald-400/30 bg-emerald-400/5 px-3 py-2 text-sm text-emerald-300">
          {bao.ok}
        </p>
      )}

      <section className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
        <h3 className="mb-3 font-semibold">Thêm giáo viên thỉnh giảng</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <input className={O} placeholder="Họ và tên" value={gvTen} onChange={(e) => setGvTen(e.target.value)} />
          <input className={O} placeholder="Môn dạy" value={gvMon} onChange={(e) => setGvMon(e.target.value)} />
          <label className="flex items-center gap-2 text-sm text-white/70">
            <input type="checkbox" checked={gvCong} onChange={(e) => setGvCong(e.target.checked)} />
            Đang dạy trường công lập
          </label>
        </div>
        <button
          onClick={themGiaoVien}
          disabled={ban || !gvTen.trim()}
          className="mt-3 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black disabled:opacity-40"
        >
          Thêm
        </button>
      </section>

      <section className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm text-white/60">Giáo viên</label>
          <select
            className={O}
            value={chon}
            onChange={(e) => {
              setChon(e.target.value);
              setBuoi([]);
              setXem(null);
            }}
          >
            <option value="">— chọn —</option>
            {giaoVien.map((g) => (
              <option key={g.id} value={g.id}>
                {g.hoTen}{g.mon ? ` · ${g.mon}` : ""}
              </option>
            ))}
          </select>
          <button
            onClick={() => nap()}
            disabled={ban || !chon}
            className="rounded-lg bg-white/10 px-4 py-2 text-sm hover:bg-white/15 disabled:opacity-40"
          >
            Xem kỳ {ky}
          </button>
        </div>

        {/* TT29: giáo viên trường công phải báo cáo hiệu trưởng, và KHÔNG được
            tham gia quản lý điều hành. Đây là rủi ro chiến lược xếp mức Cao —
            không phải việc mình sửa, nhưng phải chỉ ra. */}
        {gvChon?.laGvTruongCong && !gvChon.daBaoCaoHieuTruong && (
          <p className="mt-3 rounded-lg border border-amber-400/30 bg-amber-400/5 px-3 py-2 text-sm text-amber-200">
            {gvChon.hoTen} đang dạy trường công lập và <strong>chưa ghi nhận báo cáo hiệu trưởng</strong>.
            Theo TT29 đây là bắt buộc, và danh sách người dạy lại là thứ phải công khai nên không giấu được.
          </p>
        )}
      </section>

      {chon && (
        <section className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
          <h3 className="font-semibold">Dán buổi dạy từ Excel</h3>
          <p className="mt-1 text-sm text-white/50">
            Hai cột: <strong className="text-white/70">ngày · đơn giá mỗi buổi</strong>. Cột thứ ba bỏ qua.
          </p>
          <textarea
            value={khoi}
            onChange={(e) => setKhoi(e.target.value)}
            rows={4}
            placeholder={"05/07/2026\t500.000\n07/07/2026\t500.000"}
            className={`${O} mt-3 w-full font-mono text-xs`}
          />
          {truoc && (
            <div className="mt-3 space-y-2 text-sm">
              <p className="text-white/60">
                Đọc được <strong className="text-emerald-300">{truoc.dong.length}</strong> buổi
                {truoc.loi.length > 0 && <>, <strong className="text-red-300">{truoc.loi.length}</strong> dòng lỗi</>}.
              </p>
              {truoc.loi.length > 0 && (
                <ul className="list-inside list-disc text-xs text-red-300/80">
                  {truoc.loi.slice(0, 6).map((l) => <li key={l.dong}>Dòng {l.dong}: {l.ly}</li>)}
                </ul>
              )}
              <button
                onClick={ghiBuoi}
                disabled={ban || truoc.dong.length === 0 || truoc.loi.length > 0}
                className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black disabled:opacity-40"
              >
                Ghi {truoc.dong.length} buổi
              </button>
            </div>
          )}
        </section>
      )}

      {xem && (
        <section className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
          <h3 className="mb-1 font-semibold">
            Bảng thù lao {xem.hoTen} — kỳ {ky}
          </h3>
          <p className="mb-4 text-sm text-white/50">
            {xem.ketQua.soBuoi} buổi chưa chốt · ngưỡng khấu trừ đang áp dụng {tien(xem.ketQua.nguongApDung)}
          </p>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-white/10 p-3">
              <p className="text-xs uppercase tracking-wide text-white/40">Tổng trước thuế</p>
              <p className="mt-1 text-lg font-bold tabular-nums">{tien(xem.ketQua.tongTruocThue)}</p>
            </div>
            <div className="rounded-lg border border-white/10 p-3">
              <p className="text-xs uppercase tracking-wide text-white/40">Khấu trừ TNCN 10%</p>
              <p className="mt-1 text-lg font-bold tabular-nums text-amber-300">
                −{tien(xem.ketQua.khauTruTncn)}
              </p>
            </div>
            <div className="rounded-lg border border-white/10 p-3">
              <p className="text-xs uppercase tracking-wide text-white/40">Thực nhận</p>
              <p className="mt-1 text-lg font-bold tabular-nums text-emerald-300">
                {tien(xem.ketQua.thucNhan)}
              </p>
            </div>
          </div>

          {/* Câu này là phần đáng giá nhất màn hình: nó nói VÌ SAO ra con số đó,
              nên kế toán đối chiếu được thay vì phải tin. */}
          <p className="mt-3 rounded-lg bg-white/[0.03] px-3 py-2 text-sm text-white/60">{xem.ketQua.lyDo}</p>

          {xem.ketQua.chiTiet.length > 0 && (
            <div className="mt-4 overflow-x-auto rounded-lg border border-white/10">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wide text-white/40">
                  <tr>
                    <th className="px-3 py-2 font-medium">Ngày</th>
                    <th className="px-3 py-2 font-medium text-right">Đơn giá</th>
                    <th className="px-3 py-2 font-medium text-right">Thành tiền</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {xem.ketQua.chiTiet.map((c, i) => (
                    <tr key={i}>
                      <td className="px-3 py-1.5 text-white/60">{c.ngay}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums text-white/60">{tien(c.donGia)}</td>
                      <td className="px-3 py-1.5 text-right font-medium tabular-nums">{tien(c.thanhTien)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <button
            onClick={chot}
            disabled={ban || chuaChot.length === 0}
            className="mt-4 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black disabled:opacity-40"
          >
            Chốt bảng thù lao
          </button>
          <p className="mt-2 text-xs text-white/40">
            Chốt xong, từng buổi trong bảng được gắn vào bảng thù lao này — mở ra là thấy đủ danh sách buổi,
            không phải tin một con số tổng.
          </p>
        </section>
      )}
    </div>
  );
}
