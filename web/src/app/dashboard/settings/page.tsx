"use client";

import { useCallback, useEffect, useState } from "react";

type CaiDat = {
  ten: string;
  diaChi: string | null;
  dienThoai: string | null;
  email: string | null;
  maSoThue: string | null;
  vungLuongToiThieu: number;
  khaiThueTheo: string;
};

const RONG: CaiDat = {
  ten: "",
  diaChi: "",
  dienThoai: "",
  email: "",
  maSoThue: "",
  vungLuongToiThieu: 1,
  khaiThueTheo: "quy",
};

/** Sàn đóng BHXH theo vùng — con số thật đọc từ bảng tham_so_phap_ly, không ghi ở đây. */
const VUNG = [
  { v: 1, nhan: "Vùng I — Hà Nội, TP.HCM và các quận nội thành" },
  { v: 2, nhan: "Vùng II" },
  { v: 3, nhan: "Vùng III" },
  { v: 4, nhan: "Vùng IV" },
];

export default function TrangCaiDat() {
  const [form, setForm] = useState<CaiDat>(RONG);
  const [dangTai, setDangTai] = useState(true);
  const [dangLuu, setDangLuu] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);
  const [bao, setBao] = useState<string | null>(null);

  const nap = useCallback(async () => {
    const res = await fetch("/api/settings/company");
    if (!res.ok) {
      setLoi("Không đọc được cài đặt — có thể tài khoản không đủ quyền.");
      setDangTai(false);
      return;
    }
    const { caiDat } = await res.json();
    setForm({
      ten: caiDat.ten ?? "",
      diaChi: caiDat.diaChi ?? "",
      dienThoai: caiDat.dienThoai ?? "",
      email: caiDat.email ?? "",
      maSoThue: caiDat.maSoThue ?? "",
      vungLuongToiThieu: caiDat.vungLuongToiThieu ?? 1,
      khaiThueTheo: caiDat.khaiThueTheo ?? "quy",
    });
    setDangTai(false);
  }, []);

  useEffect(() => {
    const t = setTimeout(nap, 0);
    return () => clearTimeout(t);
  }, [nap]);

  async function luu() {
    setDangLuu(true);
    setLoi(null);

    const res = await fetch("/api/settings/company", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setDangLuu(false);

    if (!res.ok) {
      setLoi((await res.json().catch(() => ({}))).message ?? "Không lưu được.");
      return;
    }
    setBao("Đã lưu.");
    setTimeout(() => setBao(null), 3000);
  }

  const oNhap =
    "w-full rounded-lg border border-white/10 bg-[#0d0d12] px-3 py-2 text-white placeholder:text-white/25";

  if (dangTai) return <p className="text-sm text-white/40">Đang tải…</p>;

  return (
    <div className="max-w-2xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Cài đặt</h1>
        <p className="mt-1 text-sm text-white/50">Thông tin trung tâm, dùng cho hồ sơ và tờ khai</p>
      </header>

      {loi && (
        <p className="rounded-lg border border-red-400/30 bg-red-400/5 px-3 py-2 text-sm text-red-300">
          {loi}
        </p>
      )}
      {bao && (
        <p className="rounded-lg border border-emerald-400/30 bg-emerald-400/5 px-3 py-2 text-sm text-emerald-300">
          {bao}
        </p>
      )}

      <section className="space-y-4 rounded-xl border border-white/10 bg-white/[0.02] p-5">
        <label className="block text-sm">
          <span className="mb-1 block text-white/60">Tên trung tâm</span>
          <input
            className={oNhap}
            value={form.ten}
            onChange={(e) => setForm((f) => ({ ...f, ten: e.target.value }))}
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-white/60">Địa chỉ</span>
          <input
            className={oNhap}
            value={form.diaChi ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, diaChi: e.target.value }))}
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block text-white/60">Điện thoại</span>
            <input
              className={oNhap}
              value={form.dienThoai ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, dienThoai: e.target.value }))}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-white/60">Email</span>
            <input
              type="email"
              className={oNhap}
              value={form.email ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
          </label>
        </div>

        <label className="block text-sm">
          <span className="mb-1 block text-white/60">Mã số thuế</span>
          <input
            className={oNhap}
            value={form.maSoThue ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, maSoThue: e.target.value }))}
          />
        </label>
      </section>

      <section className="space-y-3 rounded-xl border border-white/10 bg-white/[0.02] p-5">
        <div>
          <h2 className="font-semibold">Vùng lương tối thiểu</h2>
          <p className="mt-1 text-sm text-white/50">
            Quyết định <strong>sàn đóng BHXH</strong> — lương đóng không được thấp hơn mức tối thiểu
            của vùng. Chọn sai là tính sai mức đóng của cả trung tâm.
          </p>
        </div>
        <select
          className={oNhap}
          value={form.vungLuongToiThieu}
          onChange={(e) => setForm((f) => ({ ...f, vungLuongToiThieu: Number(e.target.value) }))}
        >
          {VUNG.map((v) => (
            <option key={v.v} value={v.v}>
              {v.nhan}
            </option>
          ))}
        </select>
      </section>

      <section className="space-y-3 rounded-xl border border-white/10 bg-white/[0.02] p-5">
        <div>
          <h2 className="font-semibold">Khai thuế theo</h2>
          <p className="mt-1 text-sm text-white/50">
            Quyết định <strong>mọi mốc trong Lịch nghĩa vụ</strong>. Theo tháng thì hạn là ngày 20
            tháng sau; theo quý thì hạn là ngày cuối tháng đầu quý sau. Chọn sai là cả lịch sai.
          </p>
        </div>
        <select
          className={oNhap}
          value={form.khaiThueTheo}
          onChange={(e) => setForm((f) => ({ ...f, khaiThueTheo: e.target.value }))}
        >
          <option value="quy">Theo quý</option>
          <option value="thang">Theo tháng</option>
        </select>
      </section>

      <button
        onClick={luu}
        disabled={dangLuu}
        className="rounded-lg bg-white px-5 py-2.5 font-semibold text-black transition hover:bg-white/90 disabled:opacity-50"
      >
        {dangLuu ? "Đang lưu…" : "Lưu"}
      </button>
    </div>
  );
}
