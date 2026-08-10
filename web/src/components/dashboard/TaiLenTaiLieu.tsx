"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { LOAI_TAI_LIEU, NHAN_LOAI_TAI_LIEU, type LoaiTaiLieu } from "@/server/tinhToan/taiLieu";

type TrangThai = { kieu: "yen" } | { kieu: "dang_tai" } | { kieu: "xong"; loi?: string; trung?: boolean };

export default function TaiLenTaiLieu({ duocTaiHopDong }: { duocTaiHopDong: boolean }) {
  const router = useRouter();
  const oFile = useRef<HTMLInputElement>(null);
  const [loai, setLoai] = useState<LoaiTaiLieu>("chung_tu");
  const [ky, setKy] = useState("");
  const [trangThai, setTrangThai] = useState<TrangThai>({ kieu: "yen" });

  const loaiChon = duocTaiHopDong ? LOAI_TAI_LIEU : LOAI_TAI_LIEU.filter((l) => l !== "hop_dong");

  async function guiFile(files: FileList | null) {
    if (!files || files.length === 0) return;
    setTrangThai({ kieu: "dang_tai" });

    let trung = 0;
    let loi: string | undefined;

    for (const file of Array.from(files)) {
      const form = new FormData();
      form.set("file", file);
      form.set("loai", loai);
      if (ky) form.set("ky", ky);

      const res = await fetch("/api/tai-lieu", { method: "POST", body: form });
      if (res.status === 409) {
        trung += 1;
        continue;
      }
      if (!res.ok) {
        loi = (await res.json().catch(() => ({}))).message ?? `Lỗi ${res.status}`;
        break;
      }
    }

    setTrangThai({ kieu: "xong", loi, trung: trung > 0 });
    if (oFile.current) oFile.current.value = "";
    router.refresh();
  }

  return (
    <section className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
      <h2 className="font-semibold">Tải tài liệu lên</h2>
      <p className="mt-1 text-sm text-white/50">
        Chọn nhiều file một lúc cũng được. Tải lại đúng file đã có thì hệ thống báo trùng chứ không
        lưu thành hai bản.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block text-white/60">Loại tài liệu</span>
          <select
            value={loai}
            onChange={(e) => setLoai(e.target.value as LoaiTaiLieu)}
            className="w-full rounded-lg border border-white/10 bg-[#0d0d12] px-3 py-2 text-white"
          >
            {loaiChon.map((l) => (
              <option key={l} value={l}>
                {NHAN_LOAI_TAI_LIEU[l]}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm">
          <span className="mb-1 block text-white/60">
            Kỳ <span className="text-white/35">— để trống nếu không thuộc kỳ nào</span>
          </span>
          <input
            value={ky}
            onChange={(e) => setKy(e.target.value)}
            placeholder="2026-07 hoặc 2026"
            className="w-full rounded-lg border border-white/10 bg-[#0d0d12] px-3 py-2 text-white placeholder:text-white/25"
          />
        </label>
      </div>

      <input
        ref={oFile}
        type="file"
        multiple
        onChange={(e) => guiFile(e.target.files)}
        disabled={trangThai.kieu === "dang_tai"}
        className="mt-4 block w-full text-sm text-white/70
                   file:mr-3 file:cursor-pointer file:rounded-lg file:border-0
                   file:bg-white/10 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white
                   hover:file:bg-white/15 disabled:opacity-50"
      />

      {trangThai.kieu === "dang_tai" && <p className="mt-3 text-sm text-white/60">Đang tải lên…</p>}
      {trangThai.kieu === "xong" && trangThai.loi && (
        <p className="mt-3 text-sm text-red-300">{trangThai.loi}</p>
      )}
      {trangThai.kieu === "xong" && !trangThai.loi && (
        <p className="mt-3 text-sm text-emerald-300">
          Xong.{trangThai.trung ? " Có file đã có sẵn trong kho nên bỏ qua." : ""}
        </p>
      )}
    </section>
  );
}
