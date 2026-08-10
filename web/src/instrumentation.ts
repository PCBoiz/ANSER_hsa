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

  /**
   * Gieo dữ liệu nền — CHỈ KHI CHƯA CÓ.
   *
   * Trước audit 10/08/2026, khối này chạy đủ ~20 lệnh INSERT mỗi lần
   * `register()` được gọi. Trên VPS thì một lần khi khởi động, chấp nhận được.
   * Trên Vercel thì `register()` chạy MỖI LẦN có instance mới — tức là mỗi cold
   * start gõ vào database hai chục lượt ghi chỉ để không ghi gì (nhờ
   * `onConflictDoNothing`), và cộng thẳng vào độ trễ của người dùng đầu tiên.
   *
   * Nay: một câu đếm rẻ, thấy đã có thì thôi. Vẫn tự lành khi dựng môi trường
   * mới, mà không trả giá ở mọi cold start.
   */
  const { demChuaDuyet, gieoThamSoPhapLy, kiemTraBacThue } = await import("@/server/store/thamSo");
  const { gieoTaiKhoanDemo } = await import("@/server/store/users");
  const { baoDamDongCaiDat } = await import("@/server/store/settings");

  const daCo = await demChuaDuyet().catch(() => null);
  if (!daCo || daCo.thamSo + daCo.bacThue === 0) {
    await gieoTaiKhoanDemo();
    await baoDamDongCaiDat();
    await gieoThamSoPhapLy();
  }

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
        "Số do máy tra về, có ghi nguồn nhưng chưa ai xác nhận.",
    );
  }
}
