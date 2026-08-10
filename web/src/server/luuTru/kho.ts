/**
 * Kho file — S3-compatible (Cloudflare R2 hoặc Backblaze B2).
 *
 * Neon là database, không phải kho file. Để file trên ổ đĩa VPS thì mất VPS là
 * mất toàn bộ chứng từ của khách; để trên Google Drive thì quay lại đúng cái
 * chị Mai đang kêu là lộn xộn.
 *
 * KHÔNG hardcode khoá. Bốn biến dưới đây do chủ dự án tự đặt vào .env.local —
 * xem .env.example. Thiếu biến thì `khoCauHinhChua()` trả false và đường tải lên
 * trả 503 kèm câu tiếng Việt nói rõ thiếu gì, thay vì đổ 500 không ai hiểu.
 */

import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const BIEN_CAN = ["S3_ENDPOINT", "S3_BUCKET", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY"] as const;

export function bienConThieu(): string[] {
  return BIEN_CAN.filter((b) => !process.env[b]);
}

export function khoCauHinhChua(): boolean {
  return bienConThieu().length === 0;
}

let khach: S3Client | undefined;

function layKhach(): S3Client {
  const thieu = bienConThieu();
  if (thieu.length > 0) {
    throw new Error(`Kho file chưa cấu hình. Thiếu: ${thieu.join(", ")}. Xem .env.example.`);
  }
  if (!khach) {
    khach = new S3Client({
      // R2 và B2 đều bỏ qua region nhưng SDK bắt buộc phải có một giá trị.
      region: process.env.S3_REGION || "auto",
      endpoint: process.env.S3_ENDPOINT,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID!,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
      },
      forcePathStyle: true, // B2 cần; R2 chấp nhận được
    });
  }
  return khach;
}

const BUCKET = () => process.env.S3_BUCKET!;

export async function dayLen(duongDan: string, noiDung: Uint8Array, dinhDang?: string): Promise<void> {
  await layKhach().send(
    new PutObjectCommand({
      Bucket: BUCKET(),
      Key: duongDan,
      Body: noiDung,
      ContentType: dinhDang || "application/octet-stream",
    }),
  );
}

/**
 * URL ký sẵn để TRÌNH DUYỆT tự đẩy file thẳng lên R2, không qua server.
 *
 * Lý do đổi: Vercel Function có trần body **4,5MB ở tầng hạ tầng**, không đổi
 * được bằng cấu hình. File đi qua server là mọi bản scan hợp đồng nhiều trang
 * đều 413. Tải thẳng thì server không gánh byte nào, và cách này chạy y hệt
 * trên VPS nên về sau không phải làm lại.
 *
 * URL gắn chặt vào ĐÚNG MỘT đường dẫn: người cầm được nó cũng chỉ ghi được vào
 * đúng khoá đó, không ghi đè file khác. Sống 10 phút.
 */
export async function duongTaiLen(duongDan: string, dinhDang?: string): Promise<string> {
  const lenh = new PutObjectCommand({
    Bucket: BUCKET(),
    Key: duongDan,
    ContentType: dinhDang || "application/octet-stream",
  });
  return getSignedUrl(layKhach(), lenh, { expiresIn: 600 });
}

export type ThongTinObject = { kichThuoc: number; etag: string; dinhDang: string | null };

/**
 * Hỏi R2 xem cái vừa được đẩy lên THẬT SỰ là gì.
 *
 * Đây là bước then chốt của cả thiết kế. Tải thẳng nghĩa là server không thấy
 * byte nào — nếu tin lời trình duyệt báo về thì kích thước và mã băm đều là thứ
 * client tự khai, và client thì nói dối được.
 *
 * `HEAD` một lần cho mỗi file, gần như không tốn gì, và đổi lại:
 *   - trần dung lượng ép được THẬT, không phải nhờ trình duyệt tử tế
 *   - ETag do R2 tính, không do client gửi
 *
 * Trả `null` khi object không tồn tại — tức là trình duyệt báo xong nhưng thực
 * ra chưa đẩy được. Không có nó thì sổ có một dòng trỏ vào hư không.
 */
export async function thongTinObject(duongDan: string): Promise<ThongTinObject | null> {
  try {
    const r = await layKhach().send(new HeadObjectCommand({ Bucket: BUCKET(), Key: duongDan }));
    return {
      kichThuoc: Number(r.ContentLength ?? 0),
      // R2 trả ETag trong dấu nháy kép. Với file đẩy một lượt, nó là MD5 của
      // nội dung — yếu hơn SHA-256 trước va chạm cố ý, nhưng chống trùng vốn là
      // chống TẢI NHẦM HAI LẦN, và MD5 thừa sức cho việc đó. Điểm quan trọng là
      // nó do R2 tính chứ không do client khai.
      etag: String(r.ETag ?? "").replace(/^"|"$/g, ""),
      dinhDang: r.ContentType ?? null,
    };
  } catch {
    return null;
  }
}

/**
 * Đường tải về ký sẵn, sống 5 phút.
 *
 * Không để bucket công khai: chứng từ có tên học viên và mức lương, mà một URL
 * công khai thì rò ra là rò vĩnh viễn. Ký ngắn hạn nghĩa là link chia sẻ nhầm
 * cũng chết sau năm phút.
 */
export async function duongTaiVe(duongDan: string, tenHienThi?: string): Promise<string> {
  const lenh = new GetObjectCommand({
    Bucket: BUCKET(),
    Key: duongDan,
    ResponseContentDisposition: tenHienThi
      ? `attachment; filename*=UTF-8''${encodeURIComponent(tenHienThi)}`
      : undefined,
  });
  return getSignedUrl(layKhach(), lenh, { expiresIn: 300 });
}

export async function xoaKhoiKho(duongDan: string): Promise<void> {
  await layKhach().send(new DeleteObjectCommand({ Bucket: BUCKET(), Key: duongDan }));
}
