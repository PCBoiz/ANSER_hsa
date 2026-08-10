/**
 * Hàm thuần cho sổ thu chi. KHÔNG import gì chạm database.
 *
 * Phần đáng sợ nhất ở đây là `docSoTien`. Người Việt viết `1.500.000` cho một
 * triệu rưỡi, còn JavaScript đọc `"1.500"` thành `1.5`. Sai một dấu chấm là sai
 * số tiền một nghìn lần, và bảng vẫn cân đối, vẫn không có lỗi nào — đúng loại
 * lỗi không ai phát hiện tới lúc quyết toán.
 *
 * Vì thế mọi hàm đọc ở đây trả về `null` khi KHÔNG CHẮC, chứ không đoán bừa.
 * "Chưa biết" khác 0, và ở đây "không chắc" khác "đoán một con số nghe hợp lý".
 */

export type LoaiSo = "thu" | "chi";

/* ─────────────────────────────────────────────────────────────── kỳ ───── */

/** `'2026-07-15'` → `'2026-07'`. Kỳ luôn suy từ ngày, không cho gõ tay lệch nhau. */
export function suyKyTuNgay(ngayISO: string): string | null {
  const m = /^(\d{4})-(\d{2})-\d{2}$/.exec(ngayISO.trim());
  if (!m) return null;
  const thang = Number(m[2]);
  if (thang < 1 || thang > 12) return null;
  return `${m[1]}-${m[2]}`;
}

export function laKyHopLe(ky: string): boolean {
  const m = /^(\d{4})-(\d{2})$/.exec(ky);
  if (!m) return false;
  const t = Number(m[2]);
  return t >= 1 && t <= 12 && Number(m[1]) >= 2000 && Number(m[1]) <= 2100;
}

/* ──────────────────────────────────────────────────────────── số tiền ───── */

/**
 * Đọc số tiền viết theo kiểu người Việt. Trả `null` khi không chắc.
 *
 * Quy tắc phân biệt dấu nghìn với dấu thập phân:
 *
 *  1. Có CẢ `.` lẫn `,` → dấu xuất hiện SAU CÙNG là dấu thập phân.
 *     `1.500.000,50` → 1500000,5   ·   `1,500,000.50` → 1500000,5
 *  2. Chỉ một loại dấu, xuất hiện NHIỀU LẦN → chắc chắn là dấu nghìn.
 *     `1.500.000` → 1500000
 *  3. Chỉ một loại dấu, xuất hiện MỘT LẦN → nhìn số chữ số phía sau:
 *     đúng 3 chữ số thì là dấu nghìn (`1.500` → 1500), 1–2 chữ số thì là thập
 *     phân (`1,5` → 1,5). Đây là chỗ duy nhất phải đoán, và quy ước này khớp
 *     với cách mọi bản xuất kế toán Việt ghi tiền.
 *
 * Tiền VND không có phần lẻ nên phần thập phân được **làm tròn nửa lên** — cùng
 * một quy tắc với bài học 6 của ERD_CHUAN, không để mỗi nơi làm tròn một kiểu.
 */
export function docSoTien(thoInput: string): number | null {
  let s = String(thoInput ?? "").trim();
  if (!s) return null;

  // Bỏ ký hiệu tiền tệ, khoảng trắng mọi loại (kể cả non-breaking từ Excel).
  s = s.replace(/[đ₫]/giu, "").replace(/vnd/gi, "").replace(/[\s  ]/g, "");

  // Số âm trong ngoặc theo kiểu kế toán: (1.500.000)
  let am = false;
  if (/^\(.*\)$/.test(s)) {
    am = true;
    s = s.slice(1, -1);
  }
  if (s.startsWith("-")) {
    am = true;
    s = s.slice(1);
  }

  if (!/^[\d.,]+$/.test(s) || !/\d/.test(s)) return null;

  const viTriCham = s.lastIndexOf(".");
  const viTriPhay = s.lastIndexOf(",");
  let phanNguyen: string;
  let phanLe = "";

  /**
   * Nhóm dấu nghìn phải đúng cấu trúc `1-3 chữ số` rồi các nhóm `đúng 3 chữ số`.
   *
   * Không kiểm chỗ này thì `"1,5,"` bị coi là hai dấu nghìn, các dấu bị bóc đi
   * và ra 15 — một con số hoàn toàn bịa từ đầu vào hỏng. `"1.50.000"` cũng thế.
   * Đầu vào hỏng phải trả `null`, không phải trả một số nghe được.
   */
  const nhomDungChuan = (phan: string, dau: string) =>
    new RegExp(`^\\d{1,3}(\\${dau}\\d{3})+$`).test(phan);

  if (viTriCham >= 0 && viTriPhay >= 0) {
    const viTriLe = Math.max(viTriCham, viTriPhay);
    const dauNghin = viTriLe === viTriCham ? "," : ".";
    const truocLe = s.slice(0, viTriLe);
    if (truocLe.includes(dauNghin) && !nhomDungChuan(truocLe, dauNghin)) return null;
    phanNguyen = truocLe.replace(/[.,]/g, "");
    phanLe = s.slice(viTriLe + 1);
  } else if (viTriCham >= 0 || viTriPhay >= 0) {
    const dau = viTriCham >= 0 ? "." : ",";
    const soLan = s.split(dau).length - 1;
    const sau = s.slice(s.lastIndexOf(dau) + 1);
    if (soLan > 1 || sau.length === 3) {
      if (!nhomDungChuan(s, dau)) return null; // dấu nghìn nhưng nhóm sai
      phanNguyen = s.replace(/[.,]/g, "");
    } else {
      // Một dấu, không phải nhóm nghìn → phần thập phân. Chỉ nhận 1–2 chữ số:
      // tiền VND không có đơn vị nhỏ hơn đồng, nên "1.5000" không phải một số
      // tiền viết đúng — nó là đầu vào hỏng, và đoán nó thành 2đ là bịa.
      if (sau.length < 1 || sau.length > 2) return null;
      phanNguyen = s.slice(0, s.lastIndexOf(dau));
      phanLe = sau;
    }
  } else {
    phanNguyen = s;
  }

  if (!/^\d+$/.test(phanNguyen)) return null;
  if (phanLe && !/^\d+$/.test(phanLe)) return null;

  const nguyen = Number(phanNguyen);
  if (!Number.isFinite(nguyen)) return null;

  // Làm tròn nửa lên trên phần lẻ, rồi bỏ phần lẻ — VND không có xu.
  const le = phanLe ? Number(`0.${phanLe}`) : 0;
  const ketQua = Math.floor(nguyen + le + 0.5);
  return am ? -ketQua : ketQua;
}

/* ───────────────────────────────────────────────────────────── ngày ───── */

/**
 * Đọc ngày kiểu Việt về dạng ISO `YYYY-MM-DD`. Trả `null` khi không chắc.
 *
 * Nhận `15/07/2026`, `15-7-2026`, `2026-07-15`, `15/7/26`.
 *
 * **Luôn hiểu là ngày/tháng, không phải tháng/ngày.** `05/07/2026` là mùng 5
 * tháng 7. Đây là quy ước bắt buộc phải chọn một, và chọn sai thì mọi giao dịch
 * trong 12 ngày đầu mỗi tháng rơi nhầm kỳ — sai âm thầm, không có lỗi nào.
 */
export function docNgay(thoInput: string): string | null {
  const s = String(thoInput ?? "").trim();
  if (!s) return null;

  let m = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/.exec(s);
  if (m) return ghepNgay(Number(m[1]), Number(m[2]), Number(m[3]));

  m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2}|\d{4})$/.exec(s);
  if (m) {
    const nam = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
    return ghepNgay(nam, Number(m[2]), Number(m[1]));
  }
  return null;
}

function ghepNgay(nam: number, thang: number, ngay: number): string | null {
  if (nam < 2000 || nam > 2100 || thang < 1 || thang > 12 || ngay < 1 || ngay > 31) return null;
  // Chặn 31/02: dựng Date rồi soi lại có bị trôi sang tháng sau không.
  const d = new Date(Date.UTC(nam, thang - 1, ngay));
  if (d.getUTCMonth() !== thang - 1 || d.getUTCDate() !== ngay) return null;
  return `${nam}-${String(thang).padStart(2, "0")}-${String(ngay).padStart(2, "0")}`;
}

/* ──────────────────────────────────────────────────── dán từ Excel ───── */

export type DongDan = {
  dong: number; // số thứ tự dòng trong khối dán, 1-based
  ngay: string;
  ky: string;
  soTien: number;
  moTa: string;
  cot: string[]; // nguyên văn, để hiện lại cho người dùng đối chiếu
};

export type LoiDan = { dong: number; ly: string; cot: string[] };

/**
 * Đọc khối dán từ Excel. Ba cột theo thứ tự: **ngày · số tiền · mô tả**.
 *
 * Không đoán thứ tự cột và không tự dò tiêu đề: dò sai thứ tự cột là hoán vị
 * ngày với số tiền, mà cả hai đều là số nên không có gì báo. Thứ tự cố định,
 * nói rõ trên giao diện.
 *
 * Trả về CẢ dòng đọc được lẫn dòng hỏng. Người dùng thấy chính xác dòng nào
 * sai và sai vì sao, thay vì nhận một câu "định dạng không hợp lệ" cho cả khối.
 */
export function docKhoiDan(tho: string): { dong: DongDan[]; loi: LoiDan[] } {
  const dong: DongDan[] = [];
  const loi: LoiDan[] = [];

  const cacDong = String(tho ?? "")
    .split(/\r?\n/)
    .map((d) => d.trim())
    .filter((d) => d.length > 0);

  cacDong.forEach((raw, i) => {
    const stt = i + 1;
    const cot = raw.split("\t").map((c) => c.trim());

    if (cot.length < 2) {
      loi.push({ dong: stt, ly: "Cần ít nhất hai cột: ngày và số tiền.", cot });
      return;
    }

    const ngay = docNgay(cot[0]);
    if (!ngay) {
      // Bỏ qua dòng tiêu đề thay vì báo lỗi — dán kèm tiêu đề là chuyện thường.
      if (stt === 1 && !docSoTien(cot[1])) return;
      loi.push({ dong: stt, ly: `Không đọc được ngày "${cot[0]}". Dùng 15/07/2026.`, cot });
      return;
    }

    const soTien = docSoTien(cot[1]);
    if (soTien === null) {
      loi.push({ dong: stt, ly: `Không đọc được số tiền "${cot[1]}".`, cot });
      return;
    }
    if (soTien <= 0) {
      loi.push({ dong: stt, ly: `Số tiền phải lớn hơn 0, đọc được ${soTien}.`, cot });
      return;
    }

    const ky = suyKyTuNgay(ngay);
    if (!ky) {
      loi.push({ dong: stt, ly: "Không suy được kỳ từ ngày.", cot });
      return;
    }

    dong.push({ dong: stt, ngay, ky, soTien, moTa: cot[2] ?? "", cot });
  });

  return { dong, loi };
}

/** Các kỳ mà một khối dán chạm tới — dùng để kiểm kỳ nào đã khoá trước khi ghi. */
export function cacKyTrongKhoi(dong: DongDan[]): string[] {
  return [...new Set(dong.map((d) => d.ky))].sort();
}
