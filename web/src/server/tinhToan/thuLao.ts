/**
 * Tính thù lao giáo viên thỉnh giảng và khấu trừ TNCN. Hàm thuần, không DB.
 *
 * Luật áp dụng: cá nhân cư trú **không ký hợp đồng lao động hoặc hợp đồng dưới
 * 3 tháng**, mỗi lần chi trả từ ngưỡng trở lên thì tổ chức chi trả phải khấu trừ
 * **10% trên toàn bộ khoản chi**, không phải trên phần vượt ngưỡng. Trừ khi cá
 * nhân làm cam kết mẫu 08/CK-TNCN.
 *
 * Hai chỗ dễ sai và cả hai đều sai theo hướng thiệt cho trung tâm:
 *
 *  1. **Khấu trừ trên phần vượt.** Trả 5 triệu, ngưỡng 2 triệu, khấu trừ 10% của
 *     3 triệu = 300k. Sai. Phải là 10% của 5 triệu = 500k. Thiếu 200k, và trung
 *     tâm là bên chịu trách nhiệm khấu trừ chứ không phải giáo viên.
 *  2. **Cộng dồn cả tháng rồi so ngưỡng, nhưng chi làm nhiều lần.** Ngưỡng tính
 *     theo TỪNG LẦN CHI TRẢ. Ở đây mỗi kỳ trả một lần nên tổng kỳ chính là lần
 *     chi trả — nếu sau này đổi sang trả nhiều đợt thì hàm này phải đổi theo.
 *
 * `nguongApDung` là tham số BẮT BUỘC truyền vào, không có giá trị mặc định.
 * Ngưỡng đang là 2.000.000đ nhưng có dự thảo nâng, và hai con số khác nhau đang
 * lưu hành. Hardcode ở đây là hẹn trước một lần tính sai.
 */

export type BuoiTinh = {
  ngay: string;
  donGia: number;
  soGio?: number | null;
  tinhTheo: "buoi" | "gio";
};

export type ChiTietBuoi = { ngay: string; donGia: number; soGio: number | null; thanhTien: number };

export type KetQuaThuLao = {
  soBuoi: number;
  chiTiet: ChiTietBuoi[];
  tongTruocThue: number;
  apDungKhauTru: boolean;
  tyLeKhauTru: number;
  khauTruTncn: number;
  thucNhan: number;
  nguongApDung: number;
  lyDo: string;
};

export type LoiTinhThuLao = { ma: "thieu_so_gio" | "don_gia_am" | "thieu_nguong"; thongDiep: string };

/** Làm tròn nửa lên — bài học 6, một hàm dùng chung, không mỗi nơi một kiểu. */
export function lamTronNuaLen(x: number): number {
  return Math.floor(x + 0.5);
}

export const TY_LE_KHAU_TRU = 0.1;

export function tinhThuLao(
  buoi: BuoiTinh[],
  tuyChon: { nguongApDung: number | undefined; coCamKet08: boolean },
): { ok: true; ketQua: KetQuaThuLao } | { ok: false; loi: LoiTinhThuLao } {
  const { nguongApDung, coCamKet08 } = tuyChon;

  // "Chưa biết" khác 0. Không tra được ngưỡng thì DỪNG, không lấy 0 rồi khấu
  // trừ mọi khoản, cũng không lấy vô cực rồi không khấu trừ khoản nào.
  if (nguongApDung === undefined || nguongApDung === null || !Number.isFinite(nguongApDung)) {
    return {
      ok: false,
      loi: {
        ma: "thieu_nguong",
        thongDiep:
          "Chưa tra được ngưỡng khấu trừ 10% trong bảng tham số pháp lý. Không tính khi chưa biết ngưỡng.",
      },
    };
  }

  const chiTiet: ChiTietBuoi[] = [];
  for (const b of buoi) {
    if (b.donGia < 0) {
      return { ok: false, loi: { ma: "don_gia_am", thongDiep: `Đơn giá âm ở buổi ${b.ngay}.` } };
    }
    if (b.tinhTheo === "gio") {
      if (b.soGio === null || b.soGio === undefined || !Number.isFinite(b.soGio) || b.soGio <= 0) {
        return {
          ok: false,
          loi: {
            ma: "thieu_so_gio",
            thongDiep: `Buổi ${b.ngay} tính theo giờ nhưng chưa ghi số giờ. Không đoán thành 1 giờ.`,
          },
        };
      }
    }
    const soGio = b.tinhTheo === "gio" ? (b.soGio as number) : null;
    const thanhTien = lamTronNuaLen(b.tinhTheo === "gio" ? b.donGia * (soGio as number) : b.donGia);
    chiTiet.push({ ngay: b.ngay, donGia: b.donGia, soGio, thanhTien });
  }

  const tongTruocThue = chiTiet.reduce((s, c) => s + c.thanhTien, 0);

  let apDungKhauTru: boolean;
  let lyDo: string;
  if (coCamKet08) {
    apDungKhauTru = false;
    lyDo = "Có cam kết 08/CK-TNCN — không khấu trừ.";
  } else if (tongTruocThue >= nguongApDung) {
    apDungKhauTru = true;
    lyDo = `Chi trả ${dinhDang(tongTruocThue)} ≥ ngưỡng ${dinhDang(nguongApDung)} — khấu trừ 10% trên TOÀN BỘ khoản chi.`;
  } else {
    apDungKhauTru = false;
    lyDo = `Chi trả ${dinhDang(tongTruocThue)} < ngưỡng ${dinhDang(nguongApDung)} — không khấu trừ.`;
  }

  const khauTruTncn = apDungKhauTru ? lamTronNuaLen(tongTruocThue * TY_LE_KHAU_TRU) : 0;

  return {
    ok: true,
    ketQua: {
      soBuoi: chiTiet.length,
      chiTiet,
      tongTruocThue,
      apDungKhauTru,
      tyLeKhauTru: TY_LE_KHAU_TRU,
      khauTruTncn,
      thucNhan: tongTruocThue - khauTruTncn,
      nguongApDung,
      lyDo,
    },
  };
}

function dinhDang(n: number): string {
  return new Intl.NumberFormat("vi-VN").format(n) + "đ";
}

/**
 * Ai nên làm cam kết 08 — gợi ý, không phải kết luận.
 *
 * Cam kết chỉ hợp lệ khi cá nhân có **duy nhất một nguồn thu nhập** thuộc diện
 * này và ước tính cả năm chưa tới mức phải nộp thuế. Điều kiện thứ nhất hệ
 * thống KHÔNG BIẾT — giáo viên dạy ở mấy trung tâm là chuyện ngoài tầm nhìn của
 * mình. Nên đây chỉ là danh sách "nên hỏi", và câu hỏi phải hỏi người thật.
 */
export function nenHoiCamKet08(
  tongCaNamTaiTrungTam: number,
  giamTruCaNam: number | undefined,
): { nen: boolean; lyDo: string } {
  if (giamTruCaNam === undefined) {
    return { nen: false, lyDo: "Chưa tra được mức giảm trừ gia cảnh — không kết luận." };
  }
  if (tongCaNamTaiTrungTam < giamTruCaNam) {
    return {
      nen: true,
      lyDo:
        `Thu nhập tại trung tâm cả năm ${dinhDang(tongCaNamTaiTrungTam)} thấp hơn mức giảm trừ ` +
        `${dinhDang(giamTruCaNam)}. NẾU đây là nguồn thu duy nhất của giáo viên thì họ làm được ` +
        `cam kết 08 — điều kiện "nguồn duy nhất" phải hỏi chính họ, hệ thống không biết.`,
    };
  }
  return {
    nen: false,
    lyDo: `Thu nhập tại trung tâm cả năm ${dinhDang(tongCaNamTaiTrungTam)} đã vượt mức giảm trừ.`,
  };
}
