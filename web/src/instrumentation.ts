export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  // Thiếu JWT_SECRET thì dừng ngay tại đây, không để app chạy tiếp rồi ký token
  // bằng một khoá mặc định.
  //
  // Gọi `moiTruong` chứ KHÔNG gọi `auth`: file này được biên dịch cho cả runtime
  // edge, và kéo `jsonwebtoken` vào đó là `require('crypto')` không phân giải
  // được → instrumentation hỏng → MỌI route trả 500, kể cả /api/health.
  const { layKhoaKy } = await import("@/server/moiTruong");
  layKhoaKy();

  const { gieoTaiKhoanDemo } = await import("@/server/store/users");
  const { baoDamDongCaiDat } = await import("@/server/store/settings");
  const { demChuaDuyet, gieoThamSoPhapLy, kiemTraBacThue } = await import("@/server/store/thamSo");

  await gieoTaiKhoanDemo();
  await baoDamDongCaiDat();
  await gieoThamSoPhapLy();

  // Không chặn app chạy — phần lớn nghiệp vụ không cần biểu thuế — nhưng tool
  // tính lương thì phải dừng khi biểu hở.
  const bac = await kiemTraBacThue();
  if (!bac.du) {
    console.warn(
      "[tham số pháp lý] Biểu thuế luỹ tiến CHƯA ĐỦ BẬC: " +
        bac.thieu.join("; ") +
        "\n  → tinh_luong_bhxh sẽ từ chối chạy.",
    );
  }

  const chua = await demChuaDuyet();
  if (chua.thamSo + chua.bacThue > 0) {
    console.warn(
      `[tham số pháp lý] ${chua.thamSo} tham số và ${chua.bacThue} bậc thuế CHƯA CÓ KẾ TOÁN RÀ. ` +
        "Số do máy tra về, có ghi nguồn nhưng chưa ai xác nhận — mọi bảng tính từ chúng " +
        "phải đóng dấu tương ứng.",
    );
  }
}
