# Triển khai ANSER-HSA

> Mục tiêu của bản này: đưa sản phẩm lên một địa chỉ HTTPS cho khách dùng thử,
> **0đ/tháng và không mua tên miền**, mà vẫn hợp lệ về điều khoản.

## Vì sao là máy ảo chứ không phải nền tảng dựng sẵn

Đã thử và đã loại hai đường:

| | Vì sao loại |
|---|---|
| Vercel Hobby | [cấm dùng cho dự án thương mại](https://vercel.com/docs/limits/fair-use-guidelines) — mà "thương mại" gồm cả trường hợp người viết mã được trả tiền |
| Cloudflare Workers | chạy thật rồi mới loại: Workers cấm dùng lại đối tượng I/O giữa hai yêu cầu, mà kết nối database là một pool WebSocket dùng chung. Xem `web/CLOUDFLARE.md` |

Máy ảo chạy Node thật, nên pool dùng chung và `db.transaction()` đều đúng —
**không phải sửa một dòng nào**. Đó là lý do chính, không phải giá tiền.

## Cần gì trước khi bắt đầu

| Thứ | Ở đâu | Tiền |
|---|---|---|
| Máy ảo | Oracle Cloud Always Free, vùng Singapore hoặc Nhật | 0đ |
| Địa chỉ web | DuckDNS | 0đ |
| Chứng chỉ HTTPS | Let's Encrypt, Caddy tự lo | 0đ |
| Database | Neon — đang dùng rồi | 0đ |
| Kho file | Cloudflare R2 — đang dùng rồi | 0đ |

**Chưa mua tên miền.** Mua sau khi ký hợp đồng, lúc đó chọn tên cùng khách.

---

## A. Máy ảo

### A1. Oracle Cloud Always Free — 0đ

[Oracle Always Free](https://www.oracle.com/cloud/free/) cho máy ảo miễn phí
vĩnh viễn và **cho phép dùng thương mại**. Chọn hình dạng `VM.Standard.A1.Flex`,
**2 OCPU / 12GB**, ảnh Ubuntu 24.04, vùng Singapore hoặc Osaka.

Ba điều phải biết trước:

1. **Đây là ARM64**, không phải x86. Ảnh Docker phải dựng ngay trên máy đó —
   sổ tay này làm đúng vậy, nên không phải lo. Chỉ đừng dựng ảnh ở máy Windows
   rồi đẩy lên.
2. Tháng 6/2026 Oracle **cắt một nửa hạn mức** Always Free của A1, từ
   4 OCPU/24GB xuống 2 OCPU/12GB, và
   [xoá máy vượt hạn mức từ 18/08/2026](https://www.infoq.com/news/2026/07/oracle-cloud-free-tier-limits/).
   Đừng xin quá 2 OCPU/12GB. Bài học kèm theo: Oracle đổi luật không báo trước,
   nên đây là **chỗ thử nghiệm, không phải nhà ở lâu dài**.
3. Xin máy ARM ở Singapore hay báo `Out of host capacity`. Thử lại vào giờ khác,
   hoặc đổi vùng.

Máy này chết cũng không sao: **nó không giữ dữ liệu gì**. Database ở Neon, file
ở R2. Mất máy là dựng lại theo đúng sổ tay này, hết.

### A2. Nếu Oracle không xin được máy

VPS trả tiền theo tháng, huỷ lúc nào cũng được — không ràng buộc năm:

| | Giá | Ghi chú |
|---|---|---|
| [Vietnix](https://vietnix.vn/vps/) | 159k/tháng | máy đặt ở Việt Nam, độ trễ thấp nhất cho khách Hà Nội |
| [Hetzner CX22](https://www.hetzner.com/cloud) | ~120k/tháng | rẻ hơn nhưng máy ở châu Âu, độ trễ về Hà Nội ~250ms |

Với khách đang ngồi ở Hà Nội bấm thử sản phẩm, **độ trễ đáng giá hơn 40k**.

### A3. Mở cổng — chỗ sai nhiều nhất

Trên Oracle phải mở ở **hai nơi**, quên nơi thứ hai là triệu chứng "DNS trỏ đúng
rồi mà vẫn không vào được":

1. **Security List của VCN** (trên web Oracle): thêm Ingress cho `0.0.0.0/0`
   TCP cổng 80 và 443.
2. **Ngay trong máy** — ảnh Oracle chặn sẵn mọi cổng trừ 22:

```bash
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save
```

---

## B. Địa chỉ web miễn phí

### B1. DuckDNS — cách dùng ở đây

Vào [duckdns.org](https://www.duckdns.org), đăng nhập bằng GitHub, tạo một tên
(ví dụ `anserhsa`) và trỏ về **IP công khai của máy ảo**. Được `anserhsa.duckdns.org`,
miễn phí, ổn định, đổi lúc nào cũng được. Một tài khoản được 5 tên.

Cổng 80 đã mở nên Caddy xin chứng chỉ bằng thử thách HTTP-01 — **không cần**
plugin DNS, dùng thẳng ảnh `caddy:2-alpine`.

### B2. Thay thế: Tailscale Funnel

Nếu không mở được cổng 80/443, [Tailscale Funnel](https://tailscale.com/kb/1223/funnel)
cho một địa chỉ `*.ts.net` kèm HTTPS sẵn, không cần mở cổng nào. Gọn hơn cho bản
demo riêng tư, nhưng địa chỉ trông kém tự nhiên với khách.

**Đừng dùng** Cloudflare Quick Tunnel (`*.trycloudflare.com`): địa chỉ đổi mỗi
lần khởi động lại, không hợp cho một đợt dùng thử kéo dài nhiều tuần.

---

## C. Dựng

### C1. Cài Docker

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER && exit          # đăng nhập lại cho vào nhóm
```

### C2. Lấy mã và điền biến

```bash
git clone https://github.com/PCBoiz/ANSER_hsa.git && cd ANSER_hsa
cp .env.example .env
nano .env
```

Điền đủ 7 biến. Hai điểm phải chú ý:

- `JWT_SECRET` **sinh mới**, không dùng lại khoá của máy phát triển:
  ```bash
  node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
  ```
  (chưa có node trên máy ảo thì dùng `openssl rand -base64 48 | tr '+/' '-_' | tr -d '='`)
- `TEN_MIEN=anserhsa.duckdns.org` — không kèm `https://`, không kèm dấu `/`.

### C3. Chạy migration — từ máy anh, không phải từ máy ảo

Neon nằm trên Internet nên chạy migration ở đâu cũng tới. Chạy từ máy anh:

```bash
cd web && npm run db:migrate
```

**Cố ý không** cho container tự chạy migration lúc khởi động. Tự chạy nghĩa là
mỗi lần khởi động lại là một lần đổi lược đồ ngoài tầm mắt, và nếu có hai
container cùng lên thì hai tiến trình migration chạy song song trên cùng một
database.

### C4. Lên

```bash
docker compose up -d --build
```

Lần đầu dựng ảnh mất khoảng 3–6 phút trên 2 OCPU. Theo dõi:

```bash
docker compose logs -f
```

### C5. Kiểm

```bash
curl -s https://anserhsa.duckdns.org/api/health      # {"status":"ok"}
docker compose ps                                     # app phải là "healthy"
```

Rồi mở trình duyệt, đăng nhập, và **kiểm đúng một việc dễ quên**: tải một file
lên `/dashboard/tai-lieu`. Nó sẽ hỏng, và hỏng đúng như dự đoán — xem C6.

### C6. Thêm địa chỉ mới vào CORS của R2

Trình duyệt đẩy file **thẳng lên R2**, không qua máy chủ (để né trần dung lượng).
Nghĩa là bucket phải cho phép origin mới. Vào Cloudflare → R2 → bucket
`anser-hsa` → Settings → CORS Policy, thêm `https://anserhsa.duckdns.org` vào
`AllowedOrigins` bên cạnh `http://localhost:3000`.

Kiểm bằng chính yêu cầu thăm dò mà trình duyệt gửi, và **kiểm cả chiều phủ định**
— cấu hình cho phép mọi origin cũng trả 204 cho origin đúng, nên chỉ thử origin
đúng thì không phân biệt được:

```bash
# phải ra 204 kèm Access-Control-Allow-Origin
curl -si -X OPTIONS "$URL_KY_SAN" \
  -H "Origin: https://anserhsa.duckdns.org" \
  -H "Access-Control-Request-Method: PUT" \
  -H "Access-Control-Request-Headers: content-type" | head -6

# phải ra 403
curl -so /dev/null -w '%{http_code}\n' -X OPTIONS "$URL_KY_SAN" \
  -H "Origin: https://ke-la.example" \
  -H "Access-Control-Request-Method: PUT"
```

---

## D. Về sau

### Cập nhật mã mới

```bash
git pull && docker compose up -d --build
```

### Xem log

```bash
docker compose logs -f app
docker compose exec caddy cat /data/truy-cap.log
```

### Dọn object mồ côi trên R2

Đăng nhập bằng tài khoản quản lý → `/dashboard/tai-lieu` → **Soi kho**.

### Sao lưu

Máy ảo không giữ dữ liệu nên không cần sao lưu máy. Cần sao lưu **Neon** —
nhánh và point-in-time restore đều nằm trong gói miễn phí.

---

---

## E. Railway — nếu thử đường này

Railway chạy **một container**, tự cấp HTTPS và một địa chỉ `*.up.railway.app`.
Nghĩa là `docker-compose.yml`, `Caddyfile`, DuckDNS và cả việc mở cổng đều
**không dùng đến** — chúng chỉ dành cho đường máy ảo ở trên.

### E1. Lỗi `Railpack could not determine how to build the app`

Railpack quét **thư mục gốc của repo**, mà ở gốc không có `package.json` nào —
ứng dụng nằm trong `web/`. Sửa bằng một ô trong giao diện:

> Service → **Settings** → **Source** → **Root Directory** = `web`

Đặt xong, Railway tìm thấy `web/Dockerfile` và dùng nó thay cho Railpack. Kèm
theo đó `web/railway.json` ghim sẵn builder là `DOCKERFILE` và đường kiểm sức
khoẻ `/api/health`, để Railpack không giành lại quyền dựng.

Bối cảnh build lúc đó là `web/`, đúng như `Dockerfile` giả định
(`COPY package.json package-lock.json ./`). Đừng để Root Directory ở `/` rồi
trỏ `RAILWAY_DOCKERFILE_PATH=web/Dockerfile` — đường dẫn đúng nhưng bối cảnh sai,
và lỗi sẽ là "không tìm thấy package.json", khó lần hơn nhiều.

### E2. Biến môi trường

Đặt trong Variables của service, **sáu biến** — giống `.env.example` nhưng
**bỏ `TEN_MIEN`** (Railway tự lo tên miền và chứng chỉ):

```
DATABASE_URL  JWT_SECRET  S3_ENDPOINT  S3_BUCKET  S3_ACCESS_KEY_ID  S3_SECRET_ACCESS_KEY
```

Không cần đặt `PORT` — Railway tự tiêm, và `server.js` đọc đúng biến đó.

### E3. Hai việc vẫn phải làm

Giống hệt đường máy ảo, không bỏ được cái nào:

- `npm run db:migrate` **từ máy anh** (mục C3)
- Thêm địa chỉ Railway vào **CORS của bucket R2** (mục C6), nếu không thì mọi
  thứ chạy trừ tải file lên

### E4. Tiền, và một chỗ phải tự xác minh

| | Thực tế |
|---|---|
| Dùng thử | 5 USD tín dụng một lần, 30 ngày |
| Gói Free sau đó | **1 USD tín dụng/tháng** — mà một service nhỏ nhất chạy liên tục đã tốn ~0,8–1 USD/tháng |
| Hobby | 5 USD/tháng (~130k) |
| Pro | 20 USD/tháng (~500k) |

Gói Free **không dùng được cho một đợt thử kéo dài nhiều tuần**: chi phí bám sát
đúng mức tín dụng, nên hết tiền giữa tháng là service dừng — và khách mở link
vào đúng lúc đó thì không có cách nào giải thích.

⚠️ **Phải tự xác minh trước khi chọn Railway:** có nguồn nói gói **Hobby cũng chỉ
cho dùng phi thương mại**, thương mại thì phải lên Pro — tức đúng cái bẫy của
Vercel Hobby, chỉ khác logo. Tài liệu giá của Railway *không* nói vậy, nhưng
điều khoản ràng buộc là trang HTML dựng bằng JavaScript nên chưa đọc được nguyên
văn. **Hỏi thẳng Railway trước khi đưa sản phẩm cho khách.** Nếu đúng là phi
thương mại thì Railway = 500k/tháng, đắt hơn máy ảo, và mất luôn lý do chọn nó.

---

## Việc còn nợ, ghi ở đây để khỏi quên

- **Nhánh Neon riêng cho test.** Bộ ma trận phân quyền tạo ba tài khoản
  `kiemquyen-*@kiemthu.local` rồi xoá ở `afterAll`. Ngày có dữ liệu thật của
  khách thì phải tách nhánh — một lần `afterAll` không chạy là để lại tài khoản
  mồ côi trong hệ thống của người ta.
- **`docker compose up` chưa từng chạy thử.** Nói thẳng để không ai tưởng nhầm.
  Phần *bên trong* ảnh thì đã kiểm rất kỹ ở máy phát triển: bản `standalone`
  dựng ra chạy thật, đăng nhập được, đọc ghi Neon được, ký URL R2 được, và qua
  đủ **265 test** — trong đó 120 test phân quyền chạy trên chính bản đó. Cái
  chưa kiểm là phần *vỏ*: `docker build`, `docker compose`, Caddy xin chứng chỉ.

  Ba chỗ dễ vỡ nhất ở lần chạy đầu, và dấu hiệu nhận ra:

  | Vỡ ở đâu | Dấu hiệu |
  |---|---|
  | `sharp` trên ARM64 | `docker build` đứt, thông báo nói thẳng tên gói `@img/sharp-*` |
  | Thiếu `.next/static` | trang lên nhưng **mất sạch CSS** |
  | Caddy không xin được chứng chỉ | log Caddy có `challenge failed` → gần như luôn là quên mở cổng ở một trong hai nơi (A3) |
