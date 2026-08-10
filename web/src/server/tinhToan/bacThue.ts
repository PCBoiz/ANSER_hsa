/**
 * Hàm thuần về biểu thuế. KHÔNG import gì chạm database.
 *
 * Tách khỏi `store/thamSo.ts` vì file đó mở kết nối Neon ngay lúc import — kéo
 * theo là mọi test của phần tính toán đều cần một database chỉ để kiểm một phép
 * so sánh số. Ranh giới này giống hệt tầng tool tất định bên Brain: thứ tính
 * toán được thì phải test được mà không cần hạ tầng nào.
 */

export type DaiBac = {
  bac: number;
  tuThuNhap: number | string;
  denThuNhap: number | string | null;
};

export type KetQuaKiemTra = { du: boolean; thieu: string[] };

/**
 * Biểu thuế phải phủ liền mạch từ 0 tới vô cực.
 *
 * Thiếu một khoảng nghĩa là có mức thu nhập không tra được thuế suất. Nếu chỗ
 * đó im lặng trả 0 thì bảng lương vẫn ra một con số, vẫn cân đối, và vẫn sai —
 * đúng loại lỗi không ai phát hiện tới lúc quyết toán. "Chưa biết" khác 0.
 *
 * Cột bigint/numeric của Postgres về JS là chuỗi, nên mọi so sánh đều ép số:
 * `"10000000" !== 10000000` sẽ báo hở ở mọi ranh giới.
 */
export function kiemTraDaiBac(bac: DaiBac[]): KetQuaKiemTra {
  if (bac.length === 0) return { du: false, thieu: ["chưa có bậc nào"] };

  const sapXep = [...bac].sort((a, b) => Number(a.tuThuNhap) - Number(b.tuThuNhap));
  const thieu: string[] = [];

  if (Number(sapXep[0].tuThuNhap) !== 0) thieu.push(`hở từ 0 tới ${sapXep[0].tuThuNhap}`);

  for (let i = 0; i < sapXep.length - 1; i++) {
    const tran = sapXep[i].denThuNhap;
    if (tran === null) {
      thieu.push(`bậc ${sapXep[i].bac} không có trần nhưng chưa phải bậc cuối`);
      continue;
    }
    const sau = Number(sapXep[i + 1].tuThuNhap);
    if (Number(tran) !== sau) thieu.push(`hở từ ${tran} tới ${sau}`);
  }

  if (sapXep[sapXep.length - 1].denThuNhap !== null) thieu.push("bậc cuối phải không có trần");

  return { du: thieu.length === 0, thieu };
}
