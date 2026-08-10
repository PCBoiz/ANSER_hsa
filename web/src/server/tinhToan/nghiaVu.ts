/**
 * Lịch nghĩa vụ — hạn nộp thuế, báo cáo và BHXH. Hàm thuần, không DB.
 *
 * Mọi mốc dưới đây TRA NGUỒN ngày 10/08/2026, không viết từ trí nhớ:
 *
 *  - GTGT và TNCN khấu trừ, khai theo THÁNG: chậm nhất ngày 20 tháng sau
 *  - GTGT và TNCN khấu trừ, khai theo QUÝ: chậm nhất ngày cuối tháng đầu quý sau
 *  - Quyết toán TNDN và báo cáo tài chính: cuối tháng thứ 3 sau khi kết thúc
 *    năm dương lịch, tức 31/03 năm sau
 *  - Quyết toán TNCN do DOANH NGHIỆP nộp: cuối tháng thứ 3, tức 31/03.
 *    (Cá nhân tự quyết toán thì cuối tháng thứ 4 — không thuộc việc của trung tâm)
 *  - BHXH đóng hằng tháng: chậm nhất ngày cuối cùng của THÁNG TIẾP THEO
 *    (Điều 34 Luật BHXH 2024)
 *
 * **Lệ phí môn bài: TỪ 2026 KHÔNG PHẢI NỘP NỮA.** Ghi ra đây có chủ đích — nó
 * là mốc quen thuộc nhất trong mọi lịch thuế cũ, và nhắc một nghĩa vụ đã bị bỏ
 * là làm khách mất công đi làm một việc không tồn tại.
 */

export type LoaiNghiaVu =
  | "gtgt"
  | "tncn_khau_tru"
  | "quyet_toan_tndn"
  | "quyet_toan_tncn"
  | "bctc"
  | "bhxh";

export type ChuKyKhai = "thang" | "quy";

export const NHAN_NGHIA_VU: Record<LoaiNghiaVu, string> = {
  gtgt: "Tờ khai thuế GTGT",
  tncn_khau_tru: "Tờ khai thuế TNCN khấu trừ",
  quyet_toan_tndn: "Quyết toán thuế TNDN",
  quyet_toan_tncn: "Quyết toán thuế TNCN",
  bctc: "Báo cáo tài chính",
  bhxh: "Đóng BHXH, BHYT, BHTN",
};

export type NghiaVu = {
  loai: LoaiNghiaVu;
  nhan: string;
  ky: string; // '2026-07' | 'Q3/2026' | '2026'
  hanGoc: string; // ISO, trước khi dời
  han: string; // ISO, sau khi dời khỏi cuối tuần
  doiViCuoiTuan: boolean;
  canKiemLichLe: boolean;
  canCu: string;
  conBaoNhieuNgay: number;
};

const NGAY = 86_400_000;
const iso = (d: Date) => d.toISOString().slice(0, 10);

/** Ngày lễ CỐ ĐỊNH theo dương lịch. Tết và Giỗ Tổ theo âm lịch — xem `canKiemLichLe`. */
const LE_CO_DINH = ["01-01", "04-30", "05-01", "09-02"];

function laCuoiTuan(d: Date) {
  const t = d.getUTCDay();
  return t === 0 || t === 6;
}

/**
 * Dời khỏi thứ Bảy và Chủ nhật. **Không** dời khỏi ngày lễ.
 *
 * Tết Nguyên đán và Giỗ Tổ tính theo âm lịch, và lịch nghỉ lễ do Chính phủ công
 * bố từng năm — hệ thống KHÔNG biết. Đoán ra một ngày rồi trình bày như hạn
 * chính thức là tệ hơn không nói gì: khách tin và nộp muộn. Nên chỗ nào có khả
 * năng vướng lễ thì gắn cờ `canKiemLichLe` và nói thẳng là phải kiểm lại.
 */
function doiKhoiCuoiTuan(d: Date): { ngay: Date; daDoi: boolean } {
  const x = new Date(d);
  let daDoi = false;
  while (laCuoiTuan(x)) {
    x.setUTCDate(x.getUTCDate() + 1);
    daDoi = true;
  }
  return { ngay: x, daDoi };
}

function vuongLe(d: Date): boolean {
  const md = iso(d).slice(5);
  if (LE_CO_DINH.includes(md)) return true;
  const thang = d.getUTCMonth() + 1;
  // Tết rơi vào tháng 1 hoặc 2; Giỗ Tổ mùng 10/3 âm thường rơi vào tháng 4.
  // Hạn nộp trong các tháng này có thể bị dời thêm.
  return thang === 1 || thang === 2 || thang === 4;
}

function cuoiThang(nam: number, thang1based: number): Date {
  return new Date(Date.UTC(nam, thang1based, 0));
}

function dung(
  loai: LoaiNghiaVu,
  ky: string,
  hanGoc: Date,
  canCu: string,
  moc: Date,
): NghiaVu {
  const { ngay, daDoi } = doiKhoiCuoiTuan(hanGoc);
  return {
    loai,
    nhan: NHAN_NGHIA_VU[loai],
    ky,
    hanGoc: iso(hanGoc),
    han: iso(ngay),
    doiViCuoiTuan: daDoi,
    canKiemLichLe: vuongLe(ngay),
    canCu,
    conBaoNhieuNgay: Math.round((ngay.getTime() - moc.getTime()) / NGAY),
  };
}

/**
 * Mọi nghĩa vụ có hạn rơi trong `soNgay` ngày tới, tính từ `tuNgay`.
 *
 * Trả cả nghĩa vụ ĐÃ QUÁ HẠN trong cửa sổ nhìn lại 30 ngày — quên một hạn thì
 * biết muộn còn hơn không biết, và tiền phạt tính theo ngày.
 */
export function lichNghiaVu(
  tuNgay: string,
  soNgay: number,
  cauHinh: { khaiTheo: ChuKyKhai; coBhxh: boolean },
): NghiaVu[] {
  const moc = new Date(`${tuNgay}T00:00:00Z`);
  const tran = new Date(moc.getTime() + soNgay * NGAY);
  const san = new Date(moc.getTime() - 30 * NGAY);
  const ra: NghiaVu[] = [];

  // Quét rộng hơn cửa sổ MỘT NĂM về mỗi phía, không phải một tháng.
  //
  // Nghĩa vụ của một kỳ có hạn rơi sang kỳ sau, và với quyết toán năm thì rơi
  // sang tận tháng 3 năm sau. Bắt đầu quét từ đúng năm của cửa sổ là bỏ sót
  // toàn bộ quyết toán năm trước — đúng mốc nặng nhất trong cả lịch.
  const namDau = san.getUTCFullYear() - 1;
  const namCuoi = tran.getUTCFullYear() + 1;

  for (let nam = namDau; nam <= namCuoi; nam++) {
    // ── GTGT và TNCN khấu trừ
    if (cauHinh.khaiTheo === "thang") {
      for (let t = 1; t <= 12; t++) {
        const ky = `${nam}-${String(t).padStart(2, "0")}`;
        const han = new Date(Date.UTC(t === 12 ? nam + 1 : nam, t === 12 ? 0 : t, 20));
        ra.push(dung("gtgt", ky, han, "Chậm nhất ngày 20 tháng sau — khai theo tháng", moc));
        ra.push(dung("tncn_khau_tru", ky, han, "Chậm nhất ngày 20 tháng sau — khai theo tháng", moc));
      }
    } else {
      for (let q = 1; q <= 4; q++) {
        const ky = `Q${q}/${nam}`;
        // Tháng đầu của quý sau: Q1→tháng 4, Q2→7, Q3→10, Q4→tháng 1 năm sau.
        const thangSau = q * 3 + 1;
        const han =
          thangSau > 12 ? cuoiThang(nam + 1, 1) : cuoiThang(nam, thangSau);
        const cc = "Chậm nhất ngày cuối tháng đầu quý sau — khai theo quý";
        ra.push(dung("gtgt", ky, han, cc, moc));
        ra.push(dung("tncn_khau_tru", ky, han, cc, moc));
      }
    }

    // ── BHXH: hằng tháng, chậm nhất ngày cuối THÁNG TIẾP THEO
    if (cauHinh.coBhxh) {
      for (let t = 1; t <= 12; t++) {
        const ky = `${nam}-${String(t).padStart(2, "0")}`;
        const han = t === 12 ? cuoiThang(nam + 1, 1) : cuoiThang(nam, t + 1);
        ra.push(
          dung("bhxh", ky, han, "Chậm nhất ngày cuối tháng tiếp theo — Điều 34 Luật BHXH 2024", moc),
        );
      }
    }

    // ── Quyết toán năm: cuối tháng thứ 3 sau khi kết thúc năm dương lịch
    const cuoiT3 = cuoiThang(nam + 1, 3);
    const ccNam = "Cuối tháng thứ 3 kể từ khi kết thúc năm dương lịch";
    ra.push(dung("quyet_toan_tndn", String(nam), cuoiT3, ccNam, moc));
    ra.push(
      dung("quyet_toan_tncn", String(nam), cuoiT3, `${ccNam} — do doanh nghiệp nộp`, moc),
    );
    ra.push(dung("bctc", String(nam), cuoiT3, ccNam, moc));
  }

  return ra
    .filter((n) => {
      const d = new Date(`${n.han}T00:00:00Z`);
      return d >= san && d <= tran;
    })
    .sort((a, b) => a.han.localeCompare(b.han) || a.loai.localeCompare(b.loai));
}

/** Nghĩa vụ đã quá hạn — tách riêng vì cách xử lý khác hẳn. */
export function quaHan(ds: NghiaVu[]): NghiaVu[] {
  return ds.filter((n) => n.conBaoNhieuNgay < 0);
}

export function sapToiHan(ds: NghiaVu[], trongVongNgay = 14): NghiaVu[] {
  return ds.filter((n) => n.conBaoNhieuNgay >= 0 && n.conBaoNhieuNgay <= trongVongNgay);
}
