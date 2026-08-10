import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { layChuoiKetNoi } from "@/server/moiTruong";
import * as schema from "./schema";

/**
 * Kết nối được mở LƯỜI — lần dùng đầu tiên, không phải lúc nạp module.
 *
 * Trước đây `new Pool(...)` chạy ngay ở tầng module và ném lỗi nếu thiếu
 * `DATABASE_URL`. Hệ quả chỉ lộ ra khi đóng gói Docker: `next build` có nạp các
 * module route để thu thập dữ liệu trang, nên **build đòi mật khẩu database**.
 * Mà ảnh Docker thì cố tình không được mang `.env.local` vào — bí mật không
 * thuộc về một lớp ảnh.
 *
 * Một bản build không được cần khoá của môi trường chạy. Nay nó không cần nữa.
 *
 * Chết sớm thì vẫn chết sớm, chỉ đổi chỗ: `instrumentation.ts` gọi
 * `layChuoiKetNoi()` lúc khởi động, nên thiếu biến là app không lên, chứ không
 * phải lặng lẽ chạy rồi 500 ở yêu cầu đầu tiên.
 */

type Kho = ReturnType<typeof taoDb>;

function taoDb() {
  return drizzle(new Pool({ connectionString: layChuoiKetNoi() }), { schema });
}

let thuc: Kho | undefined;

function lay(): Kho {
  if (!thuc) thuc = taoDb();
  return thuc;
}

/**
 * Proxy để mọi nơi gọi `db.select(...)`, `db.transaction(...)` y như cũ — không
 * một chỗ dùng nào phải sửa. Hàm được `bind` vào đối tượng thật vì drizzle dựa
 * vào `this`; trả thẳng hàm chưa bind thì `this` sẽ là proxy.
 */
export const db = new Proxy({} as Kho, {
  get(_bo, ten) {
    const that = lay();
    const gt = Reflect.get(that, ten) as unknown;
    return typeof gt === "function" ? gt.bind(that) : gt;
  },
});

/** Kiểu dùng chung cho `db` và một transaction — để hàm nhận cả hai. */
export type Db = Kho | Parameters<Parameters<Kho["transaction"]>[0]>[0];
