export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  // Thiếu JWT_SECRET thì dừng ngay tại đây, không để app chạy tiếp rồi ký token
  // bằng một khoá mặc định. Import động để lỗi ném ra lúc khởi động, có ngữ cảnh.
  const { kyToken } = await import("@/server/auth");
  kyToken("00000000-0000-0000-0000-000000000000");

  const { gieoTaiKhoanDemo } = await import("@/server/store/users");
  const { baoDamDongCaiDat } = await import("@/server/store/settings");
  const { gieoThamSoPhapLy, kiemTraBacThue } = await import("@/server/store/thamSo");

  await gieoTaiKhoanDemo();
  await baoDamDongCaiDat();
  await gieoThamSoPhapLy();

  // Cảnh báo to, mỗi lần khởi động, cho tới khi tra đủ. Không chặn app chạy —
  // phần lớn nghiệp vụ không cần biểu thuế — nhưng tool tính lương thì phải dừng.
  const bac = await kiemTraBacThue();
  if (!bac.du) {
    console.warn(
      "[tham số pháp lý] Biểu thuế luỹ tiến CHƯA ĐỦ BẬC: " +
        bac.thieu.join("; ") +
        "\n  → tinh_luong_bhxh sẽ từ chối chạy. Tra nốt các bậc còn thiếu rồi thêm vào thamSo.ts.",
    );
  }
}
