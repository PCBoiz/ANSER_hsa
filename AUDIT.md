# Audit — ANSER-HSA

> 10/08/2026 · soi trên mã nguồn thật, DB thật và một server đang chạy thật.
> Không có phát hiện nào ở đây đến từ việc đọc lướt — mỗi dòng đều kèm cách kiểm lại.

## 0. Con số

```
36 bảng · 79 ràng buộc CHECK · 31 khoá ngoại
28 file route API · 34 đường (method × path)
241 test: 127 hàm thuần + 114 ma trận phân quyền chạy trên server sống
```

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

*Còn nợ:* mới bọc giao dịch cho `datTrangThaiKy` — chỗ lỗi lộ ra. Các đường ghi
khác (`ghiKhoanThu`, `chotThuLao`, `datTrangThai` của TT29…) vẫn tách rời hai
bước. Chúng không gặp lỗi kiểu dữ liệu nữa nên không còn vỡ, nhưng nếu nhật ký
hỏng vì lý do khác thì vẫn ghi một nửa. Mẫu sửa đã có sẵn, chỉ là chưa áp hết.

### 1.6. Ba file chết từ khung Body

`BarChartCard.tsx`, `StatCard.tsx`, `server/n8n.ts` — không nơi nào import. Đã xoá.

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

**Còn lại một chuyện nhỏ:** trình duyệt đẩy xong rồi tắt tab trước khi xác nhận thì R2
giữ một object không bản ghi nào trỏ tới. Nó vô hình và chỉ tốn vài KB, dọn được bằng
một lượt đối chiếu khoá trên R2 với cột `duong_dan` — chưa làm.

**Việc của anh:** bật CORS trên bucket `anser-hsa` với `AllowedOrigins` gồm
`http://localhost:3000`. Chưa bật thì `curl` vẫn chạy (đã kiểm) nhưng trình duyệt sẽ
từ chối — và giao diện nói đúng chỗ đó thay vì đổ lỗi cho server.

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

### 2.3. Test phân quyền đang chạy trên chính database thật

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

1. Chốt cách xử lý trần 4,5MB (mục 2.1) trước khi đẩy lên Vercel
2. ~~Màn hình Kỳ kế toán~~ — **xong**, và chính nó làm lộ lỗi 1.5
3. Bọc giao dịch cho các đường ghi còn lại (xem cuối mục 1.5)
4. Nhánh Neon riêng cho test, trước khi có dữ liệu thật đầu tiên
