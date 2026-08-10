"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { LOAI_TAI_LIEU, NHAN_LOAI_TAI_LIEU, type LoaiTaiLieu } from "@/server/tinhToan/taiLieu";

type KetQuaMotFile = { ten: string; trangThai: "xong" | "trung" | "hong"; ly?: string };

/**
 * Tải lên ba bước: xin URL → đẩy THẲNG lên R2 → xác nhận.
 *
 * File không đi qua server. Lý do: Vercel Function có trần body 4,5MB ở tầng hạ
 * tầng, không đổi được bằng cấu hình — một bản scan hợp đồng nhiều trang là
 * vượt. Cách này cũng chạy y hệt trên VPS nên về sau không phải làm lại.
 *
 * Bước ba không phải thủ tục: server tự `HEAD` lên R2 để lấy kích thước và mã
 * băm THẬT rồi mới ghi sổ. Trình duyệt báo "xong" chỉ là lời khai.
 */
export default function TaiLenTaiLieu({ duocTaiHopDong }: { duocTaiHopDong: boolean }) {
  const router = useRouter();
  const oFile = useRef<HTMLInputElement>(null);
  const [loai, setLoai] = useState<LoaiTaiLieu>("chung_tu");
  const [ky, setKy] = useState("");
  const [dangChay, setDangChay] = useState<string | null>(null);
  const [ketQua, setKetQua] = useState<KetQuaMotFile[]>([]);

  const loaiChon = duocTaiHopDong ? LOAI_TAI_LIEU : LOAI_TAI_LIEU.filter((l) => l !== "hop_dong");

  async function motFile(file: File): Promise<KetQuaMotFile> {
    const xin = await fetch("/api/tai-lieu/xin-duong", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ten: file.name, loai, ky: ky || undefined, kichThuoc: file.size, dinhDang: file.type }),
    });
    if (!xin.ok) {
      return { ten: file.name, trangThai: "hong", ly: (await xin.json().catch(() => ({}))).message };
    }
    const { duongDan, url } = await xin.json();

    // Đẩy thẳng lên R2. Đây là chỗ CẦN CORS trên bucket — trình duyệt đang gọi
    // sang một origin khác, và nếu bucket không cho phép thì trình duyệt huỷ
    // trước khi gửi byte nào. Lỗi lúc đó là lỗi cấu hình bucket, không phải lỗi
    // server, nên thông báo phải nói đúng chỗ đó.
    let day: Response;
    try {
      day = await fetch(url, {
        method: "PUT",
        body: file,
        headers: file.type ? { "Content-Type": file.type } : undefined,
      });
    } catch {
      return {
        ten: file.name,
        trangThai: "hong",
        ly: "Trình duyệt không gửi được lên kho — nhiều khả năng bucket R2 chưa bật CORS cho địa chỉ này.",
      };
    }
    if (!day.ok) return { ten: file.name, trangThai: "hong", ly: `Kho từ chối nhận (${day.status}).` };

    const xac = await fetch("/api/tai-lieu/xac-nhan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ duongDan, ten: file.name }),
    });
    if (xac.status === 409) return { ten: file.name, trangThai: "trung" };
    if (!xac.ok) {
      return { ten: file.name, trangThai: "hong", ly: (await xac.json().catch(() => ({}))).message };
    }
    return { ten: file.name, trangThai: "xong" };
  }

  async function guiFile(files: FileList | null) {
    if (!files || files.length === 0) return;
    setKetQua([]);
    const ra: KetQuaMotFile[] = [];
    for (const file of Array.from(files)) {
      setDangChay(file.name);
      ra.push(await motFile(file));
      setKetQua([...ra]);
    }
    setDangChay(null);
    if (oFile.current) oFile.current.value = "";
    router.refresh();
  }

  const O = "w-full rounded-lg border border-white/10 bg-[#0d0d12] px-3 py-2 text-white placeholder:text-white/25";

  return (
    <section className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
      <h2 className="font-semibold">Tải tài liệu lên</h2>
      <p className="mt-1 text-sm text-white/50">
        Chọn nhiều file một lúc cũng được. File đi thẳng lên kho, không qua máy chủ — nên bản scan
        nhiều trang cũng tải được. Tải lại đúng file đã có thì hệ thống báo trùng.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block text-white/60">Loại tài liệu</span>
          <select value={loai} onChange={(e) => setLoai(e.target.value as LoaiTaiLieu)} className={O}>
            {loaiChon.map((l) => (
              <option key={l} value={l}>{NHAN_LOAI_TAI_LIEU[l]}</option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-white/60">
            Kỳ <span className="text-white/35">— để trống nếu không thuộc kỳ nào</span>
          </span>
          <input value={ky} onChange={(e) => setKy(e.target.value)} placeholder="2026-07 hoặc 2026" className={O} />
        </label>
      </div>

      <input
        ref={oFile}
        type="file"
        multiple
        onChange={(e) => guiFile(e.target.files)}
        disabled={dangChay !== null}
        className="mt-4 block w-full text-sm text-white/70
                   file:mr-3 file:cursor-pointer file:rounded-lg file:border-0
                   file:bg-white/10 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white
                   hover:file:bg-white/15 disabled:opacity-50"
      />

      {dangChay && <p className="mt-3 text-sm text-white/60">Đang tải {dangChay}…</p>}

      {ketQua.length > 0 && (
        <ul className="mt-3 space-y-1 text-sm">
          {ketQua.map((k, i) => (
            <li
              key={i}
              className={
                k.trangThai === "xong"
                  ? "text-emerald-300"
                  : k.trangThai === "trung"
                    ? "text-white/50"
                    : "text-red-300"
              }
            >
              {k.ten} — {k.trangThai === "xong" ? "xong" : k.trangThai === "trung" ? "đã có trong kho, bỏ qua" : k.ly}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
