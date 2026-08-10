# Audit — ANSER-HSA

> 10/08/2026 · soi trên mã nguồn thật, DB thật và một server đang chạy thật.
> Không có phát hiện nào ở đây đến từ việc đọc lướt — mỗi dòng đều kèm cách kiểm lại.

## 0. Con số

```
36 bảng · 79 ràng buộc CHECK · 31 khoá ngoại
32 file route API · 51 đường (method × path)
265 test: 145 hàm thuần + 120 chạy trên server sống
```

> Con số route ở bản audit đầu (*28 file · 34 đường*) đếm thiếu — nay đếm lại bằng
> `find` và `grep` trên chính thư mục `src/app/api`. Ma trận phân quyền phủ **22
> đường × 4 vai trò**, tức chưa phải toàn bộ 51; phần chưa phủ chủ yếu là nhóm
> `automation/rules/[id]/*` thừa kế từ khung Body.

Trước audit, **toàn bộ 104 test phân quyền không tồn tại** — mọi kiểm tra API đều là
`curl` tay rồi xoá đi. Đó là phát hiện lớn nhất, và cũng là thứ đã sửa đầu tiên.

---

## 1. Đã sửa

### 1.1. `GET /api/n8n/status` không kiểm quyền — rò trạng thái hạ tầng

Người chưa đăng nhập gọi được, và biết được n8n có cấu hình không, có kết nối được
không. Không phải lỗ hổng nghiêm trọng, nhưng không có lý do gì để mở.

*Kiểm lại:* `tests/api/quyen.test.ts` → *"trạng thái n8n KHÔNG được trả cho người lạ"*.

### 1.2. Nhật ký kiểm toán chỉ ghi cho một trong bảy đường ghi

Lời hứa trung tâm của sản phẩm là *"mọi con số truy được về chứng từ"*. Nhưng
`nhat_ky_thay_doi` chỉ nhận dòng từ sổ thu chi. Sáu đường còn lại im lặng — và đó
đúng là những đường nặng nhất:

| Đường ghi | Vì sao phải có dấu vết |
|---|---|
| Hồ sơ TT29 | Đánh dấu "đã công khai" là một **tuyên bố pháp lý**. Thanh tra hỏi câu đầu tiên là ai tuyên bố, lúc nào |
| Chốt và huỷ thù lao | Đây là **tiền trả ra khỏi trung tâm** |
| Đổi vai trò, xoá tài khoản | Ai cho ai quyền xem lương của ai |
| Xoá tài liệu | Chứng từ biến mất mà không ai biết ai xoá |
| Vùng lương, chu kỳ khai thuế | Đổi hai thứ này là **đổi kết quả của mọi bảng tính sau đó** |

Đã tách `ghiNhatKy` thành module dùng chung và nối vào cả sáu. Kèm `locNhayCam()`:
nhật ký là append-only nên hash mật khẩu lọt vào là ở lại vĩnh viễn, **kể cả sau khi
tài khoản đã xoá**.

Có chọn lọc chứ không ghi tất: đổi tên hay số điện thoại thì không đáng một dòng vĩnh
viễn, đổi **vai trò** thì đáng.

### 1.3. Bộ gieo chạy lại mỗi cold start — đắt trên Vercel

`instrumentation.ts` chạy ~20 lệnh `INSERT ... ON CONFLICT DO NOTHING` mỗi lần
`register()` được gọi. Trên VPS là một lần lúc khởi động, chấp nhận được. **Trên
Vercel, `register()` chạy mỗi lần có instance mới** — mỗi cold start gõ vào database
hai chục lượt ghi chỉ để không ghi gì, và cộng thẳng vào độ trễ của người dùng đầu tiên.

Nay: một câu đếm rẻ, đã có thì thôi. Vẫn tự lành khi dựng môi trường mới.

*Kiểm lại:* khởi động lần hai, log chỉ còn cảnh báo "chưa có kế toán rà", không còn
dòng nào của bộ gieo.

### 1.4. Hai bảng chỉ lớn lên, không ai dọn

`lan_dang_nhap_hong` xoá theo email **đăng nhập thành công**. Dòng của những email
không bao giờ đăng nhập được — tức là chính đám dò mật khẩu — nằm lại vĩnh viễn, và
mỗi lần kiểm chặn lại quét qua nhiều hơn.

`phien_dang_nhap` thêm một dòng mỗi lần đăng nhập, không bao giờ xoá.

Nay cả hai dọn kèm lúc đăng nhập: rác quá cửa sổ 15 phút, và phiên hết hạn quá 30
ngày. Không cần dựng cron cho hai bảng nhỏ.

### 1.5. `nhat_ky_thay_doi.ban_ghi_id` là `uuid` — khoá sổ ghi được một nửa

Lộ ra khi dựng màn hình Kỳ kế toán, và là lỗi nặng nhất tìm được trong cả audit.

`ky_ke_toan` có khoá chính là `ky` dạng `'2026-08'`, không phải uuid. Nhật ký ép
kiểu `uuid` nên **ném lỗi SAU KHI trạng thái đã đổi**: DB đã khoá sổ, API trả 400,
người dùng tưởng chưa khoá. Ghi một nửa — tệ hơn cả hai kết cục sạch.

Hai chỗ sửa, và chỗ thứ hai mới là chỗ đáng:

1. `ban_ghi_id` thành `text` — nhật ký phải trỏ được tới khoá chính của **mọi**
   bảng, không chỉ bảng dùng uuid *(migration `0007`)*.
2. **Đổi dữ liệu và ghi nhật ký nay nằm trong cùng một giao dịch.** Driver đang
   dùng là Pool/WebSocket của Neon nên `db.transaction()` chạy được thật.
   `ghiNhatKy` nhận thêm tham số `tx`. Một nhật ký kiểm toán mà có thể vắng mặt
   đúng lúc thay đổi xảy ra thì nó không phải nhật ký kiểm toán.

### 1.6. Ba file chết từ khung Body

`BarChartCard.tsx`, `StatCard.tsx`, `server/n8n.ts` — không nơi nào import. Đã xoá.

### 1.7. ~~Mười một đường ghi còn lại vẫn tách rời hai bước~~ — ĐÃ SỬA 10/08

Nợ để lại từ 1.5: khi đó mới bọc giao dịch cho `datTrangThaiKy`, chỗ lỗi lộ ra.
Nay **mọi lời gọi `ghiNhatKy` trong mã đều nhận `tx`** — kiểm bằng cách grep toàn
bộ lời gọi và đọc từng cái, không còn cái nào chạy ngoài giao dịch.

Nặng nhất là `chotThuLao`, vì nó làm **ba việc**: ghi bảng thù lao → gắn `thuLaoId`
lên từng buổi dạy → ghi nhật ký. Đứt ở bước hai để lại một bảng tiền không biết
gồm những buổi nào — đúng lỗi A4 mà migration `0003` vừa sửa xong, quay vào bằng
cửa sau. Và số tiền đó là tiền sắp trả ra khỏi trung tâm.

| Đường ghi | Số việc phải cùng sống hoặc cùng chết |
|---|---|
| `chotThuLao` | 3 — bảng thù lao, buổi dạy, nhật ký |
| `huyThuLao` | 3 — nhả buổi, xoá bảng, nhật ký |
| `ghiKhoanThu` / `ghiKhoanChi` | 2 — chèn n dòng, n dòng nhật ký |
| `danhDauKeKhai` | 2 — cập nhật hàng loạt, n dòng nhật ký |
| `xoaKhoanThu` / `xoaKhoanChi` | 2 |
| `datTrangThai` (TT29) | 2 — tuyên bố pháp lý |
| `danhDauCongKhaiTatCaGiaoVien` · `ghiNhanBaoCaoHieuTruong` | 2 |
| `capNhatNguoiDung` / `xoaNguoiDung` | 2 |
| `xoaTaiLieu` · `capNhatCaiDatCongTy` | 2 |

### 1.8. ~~Object mồ côi trên R2~~ — ĐÃ XỬ LÝ 10/08

Nợ để lại từ 2.1. Tải thẳng lên R2 tách đôi một việc vốn liền mạch: file lên kho ở
bước hai, sổ ghi ở bước ba. Đứt giữa hai bước thì object nằm lại, vô hình, vẫn tính
tiền lưu trữ — và nó là chứng từ có tên học viên nằm ngoài mọi danh sách kiểm.

Lệch được **cả hai chiều**, và chỗ đáng nghĩ là hai chiều không đối xứng:

| Chiều | Xử lý |
|---|---|
| Có file, không có sổ | rác — xoá được, **nhưng phải chờ** |
| Có sổ, không có file | báo ra, **tuyệt đối không tự xoá dòng sổ** — dòng đó là bằng chứng từng có tài liệu; biết mình mất gì thì hơn là mất luôn cả việc biết |

Cửa chờ mặc định 2 giờ. Điều kiện xoá là **giao** của hai vế — không có trong sổ
**và** đã quá hạn chờ — vì nếu chỉ xét vế đầu thì file người ta đang đẩy dở lúc
11h58 sẽ bị xoá đúng lúc 12h00 ai đó bấm dọn. `?gioCho=0` bị chặn ở cả tầng route
lẫn tầng hàm thuần, rơi về mặc định chứ không nghe theo.

*Kiểm thật, trên R2 thật:*

| Dựng tình huống | Kết quả |
|---|---|
| Tải lên đủ ba bước | khớp=1, không báo lệch |
| Đẩy lên rồi **không** xác nhận | vào nhóm "còn chờ", **không** vào nhóm mồ côi |
| Bấm dọn ngay lập tức | xoá 0 file — file đang đẩy dở còn nguyên trên bucket |
| Xoá file khỏi R2 **sau lưng** ứng dụng | báo đúng dòng "thiếu file", và dòng sổ vẫn còn |
| Kế toán bấm dọn | 403 |

*Chưa kiểm được đầu-cuối:* việc xoá một object đã **quá** cửa chờ — không đặt được
`LastModified` lùi về quá khứ trên R2. Phần phân loại có 11 test thuần phủ mốc thời
gian, còn lệnh xoá là đúng `xoaKhoiKho` mà nhánh 413 và 409 đã dùng và đã kiểm.

---

## 2. Cần bàn — không tự quyết

### 2.1. ~~Trần tải file 4,5MB của Vercel~~ — ĐÃ XỬ LÝ 10/08

**Đã xác minh:** giới hạn body của Vercel Function là **4,5MB, ở tầng hạ tầng, không
đổi được bằng `vercel.json`**. Vượt là `413 FUNCTION_PAYLOAD_TOO_LARGE`.

Kho chứng từ đang đặt trần 25MB và đẩy file **qua server**. Trên Vercel, mọi file trên
4,5MB sẽ hỏng — và một bản scan hợp đồng nhiều trang vượt rất dễ.

Ba đường:

| Cách | Được | Mất |
|---|---|---|
| **Ký sẵn, tải thẳng lên R2** | hết trần, server không gánh byte nào | phải bật CORS trên bucket, băm nội dung phải tính ở trình duyệt |
| Hạ trần xuống 4MB | không đổi kiến trúc | scan nhiều trang là vượt, khách không hiểu vì sao |
| Giữ VPS cho riêng đường tải | không đổi gì | mất lý do lên Vercel |

**Đã chọn ký sẵn tải thẳng, và thêm một bước xác nhận để gỡ cả hai nhược điểm.**

Hai nhược điểm ban đầu — mã băm do client khai, và trần dung lượng chỉ chặn được ở
trình duyệt — đều biến mất nhờ bước ba:

```
1. Trình duyệt xin URL     → server kiểm quyền, cấp URL cho ĐÚNG một đường dẫn, sống 10 phút
2. Trình duyệt PUT thẳng   → R2 nhận file, server không gánh byte nào
3. Trình duyệt báo xong    → server HEAD lên R2, lấy kích thước và ETag THẬT rồi mới ghi sổ
```

Bước 3 không phải thủ tục. Trình duyệt báo "xong" là **một lời khai**, và mọi quyết
định đều dựa vào con số server tự đọc:

| Kiểm thật | Kết quả |
|---|---|
| Đẩy 27MB nhưng client khai 100 byte | server HEAD ra 27.000.000 → **413 và xoá object** |
| Object có bị xoá thật khỏi R2 không | liệt kê bucket: không còn file nào vượt trần |
| Trùng nội dung (ETag do R2 tính) | 409, xoá object mới, trả về bản đã có |
| Xác nhận mà chưa hề đẩy file | 400, không ghi dòng nào trỏ vào hư không |
| Kế toán bịa đường dẫn `hop_dong` rồi xác nhận | **403** — `loai` đọc ngược từ đường dẫn đã ký, không lấy từ thân yêu cầu |
| Tải về sau đó | 200, nội dung khớp từng byte |

Chỗ đáng chú ý nhất là dòng áp chót. Nếu bước xác nhận tin `loai` client gửi kèm thì
kế toán xin URL cho `chung_tu` — thứ họ được phép — rồi khai thành `hop_dong` lúc xác
nhận. Đường dẫn bị khoá cứng trong chữ ký nên đọc ngược từ đó là nguồn duy nhất tin
được. `phanTichDuongDan` có 7 test riêng.

**Object mồ côi:** đã xử lý — xem 1.8.

**CORS trên bucket:** đã bật, và đã kiểm bằng cách mô phỏng đúng yêu cầu thăm dò mà
trình duyệt gửi, chứ không chỉ nhìn ảnh chụp màn hình cấu hình:

```
OPTIONS với Origin: http://localhost:3000   →  204, Allow-Origin/Headers/Methods đủ ba
OPTIONS với một origin lạ                    →  403, không header nào
```

Chiều thứ hai mới là chiều đáng kiểm: cấu hình cho phép **mọi** origin cũng trả 204
cho origin đúng, nên chỉ thử origin đúng thì không phân biệt được.

### 2.2. 16/36 bảng chưa có dòng code nào đụng tới

`hoc_vien` · `phu_huynh` · `hoc_vien_phu_huynh` · `dang_ky` · `buoi_hoc` ·
`thu_hoc_phi` · `giao_dich_ngan_hang` · `khop_thu` · `bien_lai` · `hop_dong_dao_tao` ·
`nhan_vien` · `hop_dong_lao_dong` · `nguoi_phu_thuoc` · `bang_luong` ·
`can_cu_dien_thue` · `dong_y_du_lieu`

Đây **không phải lỗi** — chúng thuộc các giai đoạn sau, và dựng lược đồ trước là quyết
định có chủ đích ở ERD.md. Nhưng nói ra để không ai tưởng sản phẩm đã chạm tới học
viên hay bảng lương.

Đáng chú ý một cái: **`dong_y_du_lieu` chưa dùng.** Chừng nào chưa có đường gửi tin
cho phụ huynh thì chưa cần — nhưng ngày có đường đó, bảng này phải được đọc TRƯỚC mỗi
lần gửi, không phải sau.

### 2.3. Vercel gói Hobby **không cho dùng thương mại** — bài toán chi phí lật ngược

Lý do duy nhất chọn Vercel là *"giảm thiểu chi phí"*. Tra điều khoản thì lý do đó
không đứng được.

[Fair Use Guidelines](https://vercel.com/docs/limits/fair-use-guidelines) của Vercel
định nghĩa dùng thương mại rất rộng: **bất kỳ deployment nào phục vụ lợi ích tài
chính của bất kỳ ai tham gia vào việc tạo ra dự án — kể cả người viết mã được trả
tiền.** Không phải "có thu tiền người dùng cuối" mới tính. Theo đúng câu chữ đó, một
sản phẩm dựng để bán cho TOP HSA là thương mại **kể cả trong giai đoạn dùng thử chưa
có hợp đồng**, vì người viết mã là bên hưởng lợi tài chính.

Muốn hợp lệ thì phải lên [Pro: **20 USD/chỗ/tháng**](https://vercel.com/docs/plans/pro-plan)
(kèm 20 USD tín dụng dùng và 1TB băng thông).

Quy ra và đặt cạnh phương án đã gạt đi:

| | VNĐ/tháng | Điều khoản |
|---|---|---|
| Vercel Hobby | 0 | **không được dùng cho dự án thương mại** |
| Vercel Pro | ~500.000 | hợp lệ |
| VPS | 150.000 – 250.000 | hợp lệ |

**VPS rẻ hơn Vercel Pro 2–3 lần.** Cái được của Vercel — CI/CD, HTTPS, CDN, không
phải trông máy — là thật và với một người làm một mình thì thời gian vận hành cũng
là tiền; nhưng nó không còn là *phương án rẻ*, mà là *phương án trả thêm tiền để đỡ
việc*. Đó là một quyết định khác hẳn.

Tên miền **không** phải khoản riêng của VPS — Vercel Pro cũng không kèm tên miền, nên
nó triệt tiêu khỏi phép so sánh. Cộng đủ mọi khoản (compute, tên miền `.com.vn`
~30k/tháng, HTTPS, CDN, Neon, R2) thì Vercel Pro ~530k/tháng, VPS ~190k/tháng. Bốn
khoản cuối hoặc miễn phí, hoặc giống hệt nhau ở cả hai bên.

Một điều làm con số VPS thật hơn bình thường: **VPS này không giữ dữ liệu gì cả.**
Database ở Neon, file ở R2. Mất VPS là dựng lại, không phải mất dữ liệu — khoản chi
phí ẩn lớn nhất của VPS ở kiến trúc này bằng không.

#### Đã thử Cloudflare Workers, và đã loại

Cloudflare **cho phép dùng thương mại ngay ở gói free**, R2 vốn đã là Cloudflare, nên
trên giấy nó là phương án hợp lệ rẻ nhất. Đã dựng thật và chạy thật trên workerd
*(nhánh `thu-cloudflare`, chi tiết ở `web/CLOUDFLARE.md`)*:

| Rủi ro | Kết quả |
|---|---|
| `jsonwebtoken`/`bcryptjs` cần `node:crypto` | **đạt** — `nodejs_compat` đủ |
| Trần 3 MiB gzip gói free | **đạt sát nút** — 2.66/3 MiB, dư 11% |
| Driver Neon + `db.transaction()` | **hỏng** — chặn hẳn |

Workers cấm dùng lại đối tượng I/O giữa hai yêu cầu, mà `db` là một `Pool` WebSocket
**ở phạm vi module** — đúng thứ bị cấm. Mọi đường đụng DB đều 500 sau yêu cầu đầu
tiên; mọi đường không đụng DB vẫn sống.

Sửa được, nhưng phải đổi `db` thành thứ lấy theo ngữ cảnh yêu cầu: **15 module** import
`db`, **15 lời gọi `db.transaction()`** ở 6 module store. Đường tắt `neon-http` thì mất
giao dịch tương tác — tức đánh đổi đúng thứ vừa làm ở 1.5 và 1.7. Không đáng, để tiết
kiệm ~130k/tháng.

#### Còn lại hai đường

1. **VPS ~190k/tháng, tất cả các khoản.** Rẻ nhất trong các phương án hợp lệ. Chạy
   Node thật nên pool phạm vi module và giao dịch tương tác đều đúng — **không phải
   sửa một dòng nào**.
2. **Vercel Pro ~530k/tháng.** Đắt gần gấp ba, đổi lại không phải trông máy.

**Đề xuất: VPS.** Không phải vì rẻ hơn, mà vì lần thử Cloudflare vừa rồi cho thấy tầng
dữ liệu của sản phẩm này gắn chặt với runtime Node — và VPS là nơi duy nhất trong ba
phương án mà điều đó không phải trả giá gì.

Và **kiến trúc hiện tại chạy y hệt trên cả hai đường còn lại.** URL ký sẵn tải thẳng
lên R2 (mục 2.1) vốn dựng để né trần 4,5MB của Vercel, nhưng nó cũng đúng trên VPS.
Nên quyết định này không khoá vào đâu cả, hoãn được đến lúc có hợp đồng.

### 2.4. Test phân quyền đang chạy trên chính database thật

Bộ test tạo ba tài khoản `kiemquyen-*@kiemthu.local` rồi xoá ở `afterAll`. Hiện DB
chưa có dữ liệu thật nên an toàn. **Ngày có dữ liệu thật thì phải đổi sang một nhánh
Neon riêng** — một lần `afterAll` không chạy là để lại tài khoản mồ côi trong hệ thống
của khách.

---

## 3. Đã kiểm và KHÔNG có vấn đề

| Kiểm | Kết quả |
|---|---|
| Bí mật trong toàn bộ lịch sử git (`npg_`, `postgresql://`, `JWT_SECRET=`) | sạch |
| `.env.local` có bị theo dõi không | không, chặn ở hai tầng gitignore |
| `.env.example` có lọt giá trị thật không | không, mọi biến trống |
| 34 đường API × 4 vai trò × cả khách vãng lai | 104/104 đúng như bảng quyền |
| Trợ giảng mở trang thù lao và sổ thu chi | bị đá về trang chủ |
| Gọi id không tồn tại | 404, không lộ có hay không |
| Đăng xuất rồi dùng lại cookie cũ | 401 |
| Cookie bịa | 401 |
| Quản lý tự cấp quyền admin | 400 |
| Mật khẩu dưới 8 ký tự | 400 |
| Chặn dò mật khẩu | bật đúng lần thứ 9 |
| Ràng buộc CHECK trên kỳ, diện thuế, số tiền, chiều giao dịch | 6/6 lệnh sai đều bị chặn |
| Nhật ký append-only | sửa và xoá đều bị trigger chặn |
| Xoá dữ liệu mẫu | mất đúng 45 dòng mẫu, dòng thật còn nguyên |

`react-dom` hiện ra trong danh sách "phụ thuộc không dùng" — đó là **dương tính giả**,
Next.js cần nó.

---

## 4. Việc kế tiếp theo thứ tự

1. ~~Chốt cách xử lý trần 4,5MB~~ — **xong** (2.1): ký sẵn, tải thẳng, kèm bước xác nhận
2. ~~Màn hình Kỳ kế toán~~ — **xong**, và chính nó làm lộ lỗi 1.5
3. ~~Bọc giao dịch cho các đường ghi còn lại~~ — **xong** (1.7)
4. ~~Dọn object mồ côi~~ — **xong** (1.8)
5. ~~Thử Cloudflare Workers~~ — **xong**, đã loại (2.3, `web/CLOUDFLARE.md`)
6. **Anh chốt VPS hay Vercel Pro** (2.3) — việc duy nhất đang chờ quyết định, không phải chờ mã
7. Nhánh Neon riêng cho test, trước khi có dữ liệu thật đầu tiên (2.4)
8. Phủ ma trận phân quyền cho nhóm `automation/rules/[id]/*` còn lại
