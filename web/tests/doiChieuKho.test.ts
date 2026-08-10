import { describe, expect, it } from "vitest";
import {
  GIO_CHO_MAC_DINH,
  chuanHoaGioCho,
  phanLoaiDoiChieu,
  type DongKho,
} from "@/server/tinhToan/doiChieuKho";

const BAY_GIO = new Date("2026-08-10T12:00:00Z");
const gioTruoc = (h: number) => new Date(BAY_GIO.getTime() - h * 3600_000);

const kho = (duongDan: string, gioTuoi: number): DongKho => ({
  duongDan,
  kichThuoc: 1024,
  sua: gioTruoc(gioTuoi),
});

const so = (duongDan: string, ten = "x.pdf") => ({ id: duongDan, ten, duongDan });

describe("phanLoaiDoiChieu", () => {
  it("file có sổ thì là khớp, không đụng vào dù cũ đến đâu", () => {
    const r = phanLoaiDoiChieu(
      [kho("2026-07/chung_tu/a-x.pdf", 10_000)],
      [so("2026-07/chung_tu/a-x.pdf")],
      BAY_GIO,
      2,
    );
    expect(r.khop).toBe(1);
    expect(r.moCoi).toHaveLength(0);
    expect(r.conCho).toHaveLength(0);
  });

  it("file không có sổ và đã quá hạn chờ thì là mồ côi", () => {
    const r = phanLoaiDoiChieu([kho("2026-07/chung_tu/a-x.pdf", 5)], [], BAY_GIO, 2);
    expect(r.moCoi.map((m) => m.duongDan)).toEqual(["2026-07/chung_tu/a-x.pdf"]);
  });

  /**
   * Cái test đáng giá nhất trong file này. Người dùng bấm chọn file lúc 11h58,
   * mạng chậm, 12h00 quản lý bấm dọn kho. Nếu điều kiện xoá chỉ là "không có
   * trong sổ" thì file đang đẩy dở bị xoá mất, và bước xác nhận sau đó báo lỗi
   * mà không ai hiểu vì sao.
   */
  it("file mới đẩy, chưa kịp xác nhận thì ĐỂ YÊN — không tính là mồ côi", () => {
    const r = phanLoaiDoiChieu([kho("2026-07/chung_tu/a-x.pdf", 0.03)], [], BAY_GIO, 2);
    expect(r.moCoi).toHaveLength(0);
    expect(r.conCho).toHaveLength(1);
  });

  it("đúng mốc hạn chờ thì vẫn để yên — chỉ xoá khi đã quá hẳn", () => {
    const r = phanLoaiDoiChieu([kho("2026-07/chung_tu/a-x.pdf", 2)], [], BAY_GIO, 2);
    expect(r.moCoi).toHaveLength(0);
    expect(r.conCho).toHaveLength(1);
  });

  it("sổ có dòng nhưng kho không có file thì báo ra, và KHÔNG nằm trong danh sách xoá", () => {
    const r = phanLoaiDoiChieu([], [so("2026-07/chung_tu/a-x.pdf", "Hoá đơn.pdf")], BAY_GIO, 2);
    expect(r.thieuFile).toEqual([
      { id: "2026-07/chung_tu/a-x.pdf", ten: "Hoá đơn.pdf", duongDan: "2026-07/chung_tu/a-x.pdf" },
    ]);
    expect(r.moCoi).toHaveLength(0);
  });

  it("lệch cả hai chiều cùng lúc vẫn tách đúng", () => {
    const r = phanLoaiDoiChieu(
      [
        kho("khop.pdf", 100),
        kho("mo-coi.pdf", 100),
        kho("vua-day.pdf", 0.1),
      ],
      [so("khop.pdf"), so("mat-file.pdf")],
      BAY_GIO,
      2,
    );
    expect(r.khop).toBe(1);
    expect(r.moCoi.map((m) => m.duongDan)).toEqual(["mo-coi.pdf"]);
    expect(r.conCho.map((m) => m.duongDan)).toEqual(["vua-day.pdf"]);
    expect(r.thieuFile.map((m) => m.duongDan)).toEqual(["mat-file.pdf"]);
  });

  it("kho rỗng và sổ rỗng thì không có gì để làm", () => {
    const r = phanLoaiDoiChieu([], [], BAY_GIO, 2);
    expect(r).toEqual({ moCoi: [], conCho: [], thieuFile: [], khop: 0 });
  });

  /**
   * `khop` được tính bằng phép trừ, nên nếu phân loại sót một dòng thì con số
   * này lệch. Giữ ràng buộc tổng ở đây để lần sau sửa hàm mà quên thì test đổ.
   */
  it("tổng ba nhóm phía kho luôn bằng số object trong kho", () => {
    const trongKho = [kho("a", 100), kho("b", 0.1), kho("c", 100), kho("d", 100)];
    const r = phanLoaiDoiChieu(trongKho, [so("a")], BAY_GIO, 2);
    expect(r.khop + r.moCoi.length + r.conCho.length).toBe(trongKho.length);
  });
});

describe("chuanHoaGioCho", () => {
  it("nhận số hợp lệ từ 1 giờ trở lên", () => {
    expect(chuanHoaGioCho("6")).toBe(6);
    expect(chuanHoaGioCho("1")).toBe(1);
  });

  /**
   * `?gioCho=0` là đường ngắn nhất để xoá đúng file người ta đang đẩy dở. Rơi về
   * mặc định chứ không nghe theo.
   */
  it("từ chối mọi giá trị dưới 1 giờ, kể cả 0 và số âm", () => {
    for (const x of ["0", "-5", "0.5"]) expect(chuanHoaGioCho(x)).toBe(GIO_CHO_MAC_DINH);
  });

  it("rác và bỏ trống đều về mặc định", () => {
    for (const x of [null, "", "abc", "NaN", "Infinity"]) {
      expect(chuanHoaGioCho(x), String(x)).toBe(GIO_CHO_MAC_DINH);
    }
  });
});
