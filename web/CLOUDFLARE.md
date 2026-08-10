# Thử Cloudflare Workers — kết quả

> 10/08/2026 · nhánh `thu-cloudflare`, **không gộp vào `main`**.
> Chạy thật trên workerd qua `wrangler dev`, không phải đọc tài liệu rồi suy đoán.

## Vì sao thử

Vercel gói Hobby [cấm dùng thương mại](https://vercel.com/docs/limits/fair-use-guidelines),
Pro là ~500k/tháng. Cloudflare Workers **cho phép dùng thương mại ngay ở gói free**, và
R2 của dự án vốn đã là Cloudflare. Nếu chạy được thì đó là phương án hợp lệ rẻ nhất.

## Kết quả: **không dùng được** nếu không sửa lớn

| Rủi ro đặt ra trước khi thử | Kết quả |
|---|---|
| 1. `jsonwebtoken` + `bcryptjs` cần `node:crypto` | **ĐẠT** — `nodejs_compat` đủ. Đăng nhập 200, token ký được, ba phần JWT đúng |
| 2. Trần 3 MiB gzip của gói free | **ĐẠT SÁT NÚT** — 2.66 MiB / 3 MiB, chỉ dư 11% |
| 3. Driver Neon + `db.transaction()` | **HỎNG** — và đây là chỗ chặn |

Ngoài ra Next.js 16 chạy được: OpenNext 1.20 hỗ trợ, và dự án **không có**
`middleware.ts`/`proxy.ts` nên tránh được đúng chỗ vướng mắc lớn nhất của Next 16
trên Cloudflare.

## Chỗ chặn

```
Cannot perform I/O on behalf of a different request. I/O objects (such as streams,
request/response bodies, and others) created in the context of one request handler
cannot be accessed from a different request's handler.
```

Nguyên nhân nằm ở một dòng:

```ts
// src/server/db/client.ts
export const db = drizzle(new Pool({ connectionString: process.env.DATABASE_URL }), { schema });
```

`Pool` là **WebSocket ở phạm vi module** — mở một lần, dùng lại cho mọi yêu cầu. Đó
là cách đúng trên Node, và là điều Workers cấm: mỗi đối tượng I/O thuộc về đúng một
yêu cầu. Yêu cầu đầu tiên mở socket thì chạy; yêu cầu sau dùng lại socket đó thì
workerd chặn, rồi treo cho tới khi bị huỷ.

Triệu chứng khớp chính xác: mọi đường **không** đụng DB đều sống, mọi đường đụng DB
đều 500 sau yêu cầu đầu.

| Đường | Đụng DB | Kết quả trên workerd |
|---|---|---|
| `GET /api/health` | không | 200 |
| `GET /api/users` (người lạ) | không (chặn ở quyền trước) | 403 — đúng |
| `POST /api/auth/login` | có | 200 ở lần đầu |
| `GET /api/auth/me` | có | **500** |
| `GET /api/so-thu-chi/thu` | có | **500** |
| `POST /api/tai-lieu/xin-duong` | có | **500** |

## Vì sao không sửa

Cách sửa duy nhất là **tạo kết nối theo từng yêu cầu** thay vì một pool dùng chung.
Trên Workers thuần thì đó là vài dòng trong `fetch()`; với Next.js thì không có chỗ
nào tương đương, nên phải đổi `db` từ một biến module thành thứ lấy theo ngữ cảnh
yêu cầu — chạm vào **15 module** đang import `db` và **15 lời gọi `db.transaction()`**
nằm rải ở 6 module store.

Đường tắt là chuyển sang driver `neon-http`. Nhưng nó **không hỗ trợ giao dịch tương
tác** — chỉ chạy được từng câu lệnh rời. Tức là đánh đổi đúng thứ vừa làm xong ở
AUDIT 1.5 và 1.7: mọi đường ghi tiền và mọi dòng nhật ký kiểm toán đang nằm trong
`db.transaction()`. Bỏ nó để tiết kiệm ~130k/tháng là một cái giá sai.

Hyperdrive của Cloudflare giữ được giao dịch, nhưng vẫn phải tạo client theo từng
yêu cầu — cùng khối lượng sửa, cộng thêm một ràng buộc riêng của Cloudflare.

## Kết luận

**Không đi Cloudflare Workers.** Không phải vì nó thiếu tính năng, mà vì tầng dữ liệu
của sản phẩm này dựng trên đúng hai thứ Workers khó chịu nhất: pool ở phạm vi module,
và giao dịch tương tác.

Nhánh này giữ lại chứ không xoá — cấu hình đã dựng sẵn, nếu sau này chấp nhận làm
việc sửa kia thì không phải bắt đầu lại.

## Nếu ai đó dựng lại nhánh này trên Windows

`opennextjs-cloudflare build` sẽ đứt ở `EPERM: operation not permitted, symlink`.
Đó là hạn chế của Windows (tạo symlink thư mục cần đặc quyền, chỉ có khi bật
Developer Mode hoặc chạy quyền quản trị), **không phải** lỗi của Cloudflare hay
OpenNext — trên Linux không có chuyện này. Bật Developer Mode, hoặc build trong
Docker/WSL.
