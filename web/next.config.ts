import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * `standalone` truy vết mọi import rồi chép ĐÚNG những gì cần chạy vào
   * `.next/standalone`, kèm một `server.js` tự chạy được.
   *
   * Cần cho việc đóng gói Docker: ảnh chỉ mang phần đó thay vì cả
   * `node_modules` phát triển, và không cần `next` lúc chạy. Trên máy ảo miễn
   * phí 12GB của Oracle thì chênh lệch này là thật, không phải làm đẹp.
   */
  output: "standalone",
};

export default nextConfig;
